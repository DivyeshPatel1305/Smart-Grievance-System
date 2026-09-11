"""
Duplicate Complaint Detector
─────────────────────────────
Uses TF-IDF cosine similarity to find complaints that are textually
similar to a new one being submitted.

Algorithm:
  1. Load recent complaints from the same city (or all if no city given).
  2. Build a TF-IDF matrix from their title + description text.
  3. Transform the new complaint text using the same vectoriser.
  4. Compute cosine similarity between the new complaint and all existing ones.
  5. Return complaints whose similarity score exceeds the threshold.

This is intentionally kept simple — no trained model, no persistent state.
The vectoriser is rebuilt on each call from the live DB (fast enough for
typical civic complaint volumes of a few thousand records).
"""
import re
from typing import List, Dict, Any


# Similarity threshold — complaints above this are flagged as potential duplicates
SIMILARITY_THRESHOLD = 0.35

# How many days back to look for duplicates
LOOKBACK_DAYS = 30

# Max complaints to return as similar
MAX_RESULTS = 5


def _clean(text: str) -> str:
    """Lowercase, remove punctuation, collapse whitespace."""
    text = (text or '').lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def find_similar_complaints(
    title: str,
    description: str,
    city: str = '',
    exclude_id: str = None,
) -> List[Dict[str, Any]]:
    """
    Find existing complaints similar to the given title+description.

    Returns a list of dicts:
        id, complaint_id, title, status, similarity_score,
        submitted_at, city, area
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.complaints.models import Complaint

    # ── Fetch candidate complaints ──────────────────────────────────────────
    cutoff = timezone.now() - timedelta(days=LOOKBACK_DAYS)
    qs = Complaint.objects(
        submitted_at__gte=cutoff,
        status__nin=['rejected'],
    )
    if city:
        # Try exact city match first, fall back to all if too few results
        city_qs = qs.filter(city__iexact=city)
        if city_qs.count() >= 5:
            qs = city_qs

    candidates = list(qs.only(
        'id', 'complaint_id', 'title', 'description',
        'status', 'submitted_at', 'city', 'area',
    ).limit(500))

    if not candidates:
        return []

    # ── Build corpus ────────────────────────────────────────────────────────
    corpus_texts = [
        _clean(f'{c.title} {c.description}')
        for c in candidates
    ]
    query_text = _clean(f'{title} {description}')

    if not query_text.strip():
        return []

    # ── TF-IDF + cosine similarity ──────────────────────────────────────────
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        # Include the query as the first document so the vectoriser
        # learns vocabulary from all texts
        all_texts = [query_text] + corpus_texts

        vectoriser = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            min_df=1,
            sublinear_tf=True,
        )
        tfidf_matrix = vectoriser.fit_transform(all_texts)

        # query vector = row 0, corpus vectors = rows 1..N
        query_vec  = tfidf_matrix[0]
        corpus_mat = tfidf_matrix[1:]

        similarities = cosine_similarity(query_vec, corpus_mat).flatten()

    except Exception as e:
        # sklearn not available or error — return empty
        import logging
        logging.getLogger(__name__).warning('Duplicate detection failed: %s', e)
        return []

    # ── Collect results above threshold ─────────────────────────────────────
    results = []
    for idx, score in enumerate(similarities):
        if float(score) < SIMILARITY_THRESHOLD:
            continue
        c = candidates[idx]
        if exclude_id and str(c.id) == str(exclude_id):
            continue
        results.append({
            'id':               str(c.id),
            'complaint_id':     c.complaint_id,
            'title':            c.title,
            'status':           c.status,
            'city':             c.city or '',
            'area':             c.area or '',
            'submitted_at':     c.submitted_at.isoformat() if c.submitted_at else None,
            'similarity_score': round(float(score), 2),
            'similarity_pct':   int(round(float(score) * 100)),
        })

    # Sort by similarity descending and cap results
    results.sort(key=lambda x: x['similarity_score'], reverse=True)
    return results[:MAX_RESULTS]
