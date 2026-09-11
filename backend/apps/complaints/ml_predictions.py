"""
ML Prediction module — Smart Public Grievance Platform.

Strategy:
  1. Try loading a pre-trained scikit-learn model from disk (ml_models/).
  2. If no model on disk, auto-train from complaints already in MongoDB.
  3. If MongoDB has too few complaints, fall back to keyword scoring.

Call retrain_model() to force a fresh train.
"""
import os
import re
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_DIR  = Path(__file__).resolve().parents[2] / 'ml_models'
MODEL_PATH = MODEL_DIR / 'complaint_category_model.joblib'
MIN_SAMPLES = 5   # min real DB samples needed before training is meaningful

# ── Category metadata ─────────────────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    'road_damage':       ['road', 'pothole', 'crack', 'lane', 'surface', 'speed breaker', 'broken road'],
    'garbage':           ['garbage', 'waste', 'trash', 'dump', 'litter', 'sanitation', 'dirty', 'smell', 'dustbin'],
    'street_light':      ['street light', 'streetlight', 'light', 'lamp', 'pole', 'dark', 'illumination', 'bulb'],
    'water_supply':      ['water', 'tap', 'pipeline', 'supply', 'leak', 'drinking', 'tank', 'no water'],
    'drainage':          ['drain', 'drainage', 'sewer', 'clog', 'flood', 'stagnant', 'blockage', 'overflow'],
    'electricity':       ['electricity', 'power', 'transformer', 'line', 'voltage', 'wire', 'pole', 'blackout'],
    'traffic':           ['traffic', 'signal', 'jam', 'congestion', 'intersection', 'accident', 'road block'],
    'illegal_parking':   ['parking', 'parked', 'vehicle', 'encroachment', 'blocked', 'obstruct'],
    'public_transport':  ['bus', 'transport', 'stop', 'route', 'metro', 'auto', 'taxi', 'stand'],
    'healthcare':        ['hospital', 'clinic', 'medical', 'doctor', 'ambulance', 'medicine', 'health'],
    'education':         ['school', 'college', 'teacher', 'student', 'classroom', 'education'],
    'government_office': ['office', 'counter', 'service', 'department', 'certificate', 'rti', 'bribe'],
    'environment':       ['tree', 'pollution', 'smoke', 'noise', 'air', 'garden', 'pond', 'dust'],
    'others':            ['issue', 'problem', 'complaint', 'request'],
}

CATEGORY_NAMES = {
    'road_damage': 'Road Damage', 'garbage': 'Garbage Collection',
    'street_light': 'Street Light', 'water_supply': 'Water Supply',
    'drainage': 'Drainage', 'electricity': 'Electricity',
    'traffic': 'Traffic', 'illegal_parking': 'Illegal Parking',
    'public_transport': 'Public Transport', 'healthcare': 'Healthcare',
    'education': 'Education', 'government_office': 'Government Office',
    'environment': 'Environment', 'others': 'Others',
}

CATEGORY_BASE_HOURS = {
    'road_damage': 72, 'garbage': 48, 'street_light': 24, 'water_supply': 72,
    'drainage': 96, 'electricity': 48, 'traffic': 48, 'illegal_parking': 24,
    'public_transport': 36, 'healthcare': 48, 'education': 48,
    'government_office': 48, 'environment': 72, 'others': 60,
}

REJECTION_KEYWORDS = ['spam', 'fake', 'fraud', 'duplicate', 'test', 'joke', 'nothing', 'false']
URGENT_KEYWORDS    = ['urgent', 'emergency', 'danger', 'risk', 'collapse', 'flood', 'fire', 'accident', 'critical']

# ── Internal cache ─────────────────────────────────────────────────────────────
_MODEL = None
_MODEL_ATTEMPTED = False


def _clean(text):
    return re.sub(r'[^a-z0-9\s]', ' ', (text or '').lower())


# ── Persistence ────────────────────────────────────────────────────────────────
def _save_model(model):
    try:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        from joblib import dump
        dump(model, MODEL_PATH)
    except Exception as e:
        logger.warning('Could not save model: %s', e)


def _load_from_disk():
    if MODEL_PATH.exists():
        try:
            from joblib import load
            return load(MODEL_PATH)
        except Exception:
            pass
    return None


# ── Training ───────────────────────────────────────────────────────────────────
def _build_training_data():
    """Build (text, label) pairs from MongoDB complaints + keyword augmentation."""
    X, y = [], []

    # Real complaints from DB
    try:
        from apps.complaints.models import Complaint
        qs = list(Complaint.objects(category__ne=None).only('title', 'description', 'category').limit(5000))
        for c in qs:
            try:
                slug = c.category.slug if c.category else None
            except Exception:
                slug = None
            if slug and slug in CATEGORY_BASE_HOURS:
                text = _clean(f'{c.title} {c.description}')
                if text.strip():
                    X.append(text)
                    y.append(slug)
    except Exception as e:
        logger.warning('Could not fetch DB complaints for training: %s', e)

    # Keyword-based synthetic samples (ensures model always has balanced classes)
    for slug, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            X.append(kw)
            y.append(slug)
        X.append(' '.join(keywords[:5]))
        y.append(slug)
        X.append(' '.join(keywords))
        y.append(slug)

    return X, y


def train_model(force=False):
    """Train or reload the category classifier. Returns model or None."""
    global _MODEL, _MODEL_ATTEMPTED

    if not force and _MODEL is not None:
        return _MODEL

    X, y = _build_training_data()

    if len(set(y)) < 2:
        logger.warning('Not enough categories for ML training.')
        return None

    try:
        from sklearn.pipeline import Pipeline
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression

        model = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=8000,
                                      sublinear_tf=True, min_df=1)),
            ('clf',   LogisticRegression(C=5.0, max_iter=500, solver='lbfgs',
                                         class_weight='balanced')),
        ])
        model.fit(X, y)
        _MODEL = model
        _MODEL_ATTEMPTED = True
        _save_model(model)
        logger.info('ML model trained on %d samples, %d categories.', len(X), len(set(y)))
        return model
    except Exception as e:
        logger.error('ML training failed: %s', e)
        return None


def retrain_model():
    """Force re-train and return status dict. Called by the API endpoint."""
    global _MODEL, _MODEL_ATTEMPTED
    _MODEL = None
    _MODEL_ATTEMPTED = False
    model = train_model(force=True)
    return {
        'success': model is not None,
        'message': 'Model retrained successfully.' if model else 'Training failed.',
        'model_path': str(MODEL_PATH) if MODEL_PATH.exists() else None,
    }


def _get_model():
    """Lazy-init: disk → auto-train → None."""
    global _MODEL, _MODEL_ATTEMPTED
    if _MODEL is not None:
        return _MODEL
    if _MODEL_ATTEMPTED:
        return None
    model = _load_from_disk()
    if model is not None:
        _MODEL = model
        _MODEL_ATTEMPTED = True
        return _MODEL
    model = train_model()
    _MODEL_ATTEMPTED = True
    return model


# ── Main prediction function ───────────────────────────────────────────────────
def get_complaint_prediction(title, description, category=None, priority='medium', is_emergency=False):
    """
    Returns a dict with:
      predicted_category, predicted_category_name,
      resolution_time_hours, estimated_resolution_hours,
      confidence, approval_chance_percent,
      outcome, outcome_label, predicted_outcome_label,
      suggested_status
    """
    cleaned = _clean(f'{title} {description}')

    # ── Keyword scoring ──
    scores = {slug: 0 for slug in CATEGORY_KEYWORDS}
    for slug, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in cleaned:
                scores[slug] += 3 if ' ' in kw else 1

    if category:
        cat_slug = getattr(category, 'slug', category)
        if cat_slug in scores:
            scores[cat_slug] += 5   # user-selected category gets strong boost

    # ── ML model ──
    model = _get_model()
    if model is not None:
        try:
            ml_slug = model.predict([cleaned])[0]
            proba    = model.predict_proba([cleaned])[0]
            ml_conf  = float(max(proba))

            if ml_slug in scores:
                scores[ml_slug] += int(ml_conf * 8)

            # Final: highest blended score; ML wins if very confident
            final_slug = max(scores, key=scores.get)
            if ml_conf >= 0.60:
                final_slug = ml_slug

            if final_slug not in CATEGORY_NAMES:
                final_slug = 'others'

            confidence = round(min(0.97, ml_conf * 0.65 + (scores[final_slug] / 25.0) * 0.35), 2)
        except Exception as e:
            logger.warning('ML predict error: %s', e)
            final_slug = max(scores, key=scores.get) or 'others'
            confidence = round(min(0.88, 0.45 + scores.get(final_slug, 0) / 20.0), 2)
    else:
        final_slug = max(scores, key=scores.get) or 'others'
        confidence = round(min(0.88, 0.45 + scores.get(final_slug, 0) / 20.0), 2)

    # ── SLA estimation ──
    base_hours = CATEGORY_BASE_HOURS.get(final_slug, 60)
    if priority == 'low':       base_hours += 24
    elif priority == 'high':    base_hours = max(12, base_hours - 12)
    elif priority == 'emergency': base_hours = max(4, base_hours - 30)
    if is_emergency:            base_hours = max(4, base_hours - 20)
    elif any(kw in cleaned for kw in URGENT_KEYWORDS):
        base_hours = max(6, base_hours - 12)

    # ── Outcome ──
    is_spam   = any(kw in cleaned for kw in REJECTION_KEYWORDS)
    is_urgent = is_emergency or any(kw in cleaned for kw in URGENT_KEYWORDS)

    if is_spam:
        outcome, outcome_label, suggested_status = (
            'likely_rejected', 'Likely to be rejected (suspicious content)', 'rejected')
        confidence = max(0.5, confidence - 0.2)
    elif is_urgent:
        outcome, outcome_label, suggested_status = (
            'urgent_escalation', 'Urgent — requires immediate action', 'assigned')
    elif confidence >= 0.65:
        outcome, outcome_label, suggested_status = (
            'likely_accepted', 'High confidence — likely to be accepted', 'assigned')
    elif confidence >= 0.45:
        outcome, outcome_label, suggested_status = (
            'needs_review', 'Moderate confidence — needs manual review', 'submitted')
    else:
        outcome, outcome_label, suggested_status = (
            'uncertain', 'Low confidence — manual categorisation recommended', 'submitted')

    return {
        'predicted_category':       final_slug,
        'predicted_category_name':  CATEGORY_NAMES.get(final_slug, 'Others'),
        'resolution_time_hours':    int(base_hours),
        'estimated_resolution_hours': int(base_hours),
        'confidence':               confidence,
        'approval_chance_percent':  int(round(confidence * 100)),
        'outcome':                  outcome,
        'outcome_label':            outcome_label,
        'predicted_outcome_label':  outcome_label,
        'suggested_status':         suggested_status,
    }
