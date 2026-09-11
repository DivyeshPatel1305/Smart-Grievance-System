import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'grievance_platform.settings'
django.setup()

import re
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from apps.complaints.ml_predictions import (
    get_complaint_prediction, _get_model, train_model,
    CATEGORY_KEYWORDS, CATEGORY_NAMES
)
from apps.complaints.models import Complaint

print("\n" + "="*60)
print("   SMART GRIEVANCE PORTAL — ML ACCURACY REPORT")
print("="*60)

# ── 1. Model info ─────────────────────────────────────────────
model = _get_model()
print(f"\nModel       : {'sklearn TF-IDF + Logistic Regression' if model else 'Keyword Fallback'}")

# ── 2. Test on real DB complaints ─────────────────────────────
real_complaints = list(
    Complaint.objects(category__ne=None)
    .only('title', 'description', 'category', 'priority', 'is_emergency')
)

print(f"Real DB complaints with category: {len(real_complaints)}")

if real_complaints:
    y_true, y_pred = [], []
    for c in real_complaints:
        try:
            actual = c.category.slug
        except Exception:
            continue
        if actual not in CATEGORY_NAMES:
            continue
        result = get_complaint_prediction(
            c.title, c.description,
            category=actual,
            priority=c.priority or 'medium',
            is_emergency=c.is_emergency or False,
        )
        y_true.append(actual)
        y_pred.append(result['predicted_category'])

    if y_true:
        acc = accuracy_score(y_true, y_pred)
        print(f"\nAccuracy on real complaints : {acc*100:.1f}%  ({len(y_true)} samples)")
    else:
        print("\nNo labelled complaints found in DB for accuracy test.")
else:
    print("\nNo complaints with categories in DB yet.")

# ── 3. Test on curated test set ───────────────────────────────
TEST_CASES = [
    ("Pothole on main road near school",        "Large pothole causing accidents on NH48",                  "road_damage"),
    ("Road crack near flyover",                  "Surface damage on the flyover approach road",              "road_damage"),
    ("Garbage not collected for 3 days",         "Waste piling up near market, bad smell",                  "garbage"),
    ("Dump yard overflowing",                    "Garbage dump near school is overflowing and spreading",   "garbage"),
    ("Street light not working",                 "Lamp post near bus stop broken for a week",               "street_light"),
    ("No street light in colony",                "Dark lane at night, no illumination near park",            "street_light"),
    ("No water supply since 2 days",             "Water tap dry, pipeline leak suspected in area",          "water_supply"),
    ("Water pipeline burst",                     "Main water line broken, flooding street",                 "water_supply"),
    ("Drain clogged near house",                 "Sewage blockage causing overflow on street",              "drainage"),
    ("Flooding due to blocked drainage",         "Rainwater not draining, road flooded due to clogged sewer","drainage"),
    ("Power outage in area",                     "No electricity since last night, transformer fault",      "electricity"),
    ("Electric pole fallen",                     "High tension wire down on road after storm",              "electricity"),
    ("Traffic signal not working",               "Signal at main intersection broken causing jam",          "traffic"),
    ("Vehicles parked illegally on road",        "Cars blocking lane near school every morning",            "illegal_parking"),
    ("Hospital cleanliness issue",               "Government clinic unhygienic, no doctor available",       "healthcare"),
    ("School building in bad condition",         "Government school roof damaged, classroom unsafe",        "education"),
    ("Certificate not issued by office",         "Revenue office not issuing caste certificate for 2 months","government_office"),
    ("Tree fallen blocking road",                "Large tree fell on road, causing pollution and blocking", "environment"),
    ("Bus route cancelled",                      "City bus no longer running on route 42 from last week",   "public_transport"),
    ("Miscellaneous civic issue",                "Some general problem with the local area service",        "others"),
]

y_true_test = []
y_pred_test = []
correct = 0

print(f"\n{'─'*60}")
print(f"{'CURATED TEST SET':^60}")
print(f"{'─'*60}")
print(f"{'Title':<45} {'Expected':<18} {'Got':<18} {'Conf':>5}")
print(f"{'─'*60}")

for title, description, expected in TEST_CASES:
    result = get_complaint_prediction(title, description)
    predicted = result['predicted_category']
    conf = result['confidence']
    match = '✓' if predicted == expected else '✗'
    if predicted == expected:
        correct += 1
    y_true_test.append(expected)
    y_pred_test.append(predicted)
    print(f"{match} {title[:43]:<43} {expected:<18} {predicted:<18} {conf:>5.2f}")

curated_acc = correct / len(TEST_CASES)
print(f"{'─'*60}")
print(f"\nCurated test accuracy : {curated_acc*100:.1f}%  ({correct}/{len(TEST_CASES)} correct)")

# ── 4. Per-category breakdown ─────────────────────────────────
if len(set(y_pred_test)) > 1:
    print(f"\n{'─'*60}")
    print(f"{'CLASSIFICATION REPORT':^60}")
    print(f"{'─'*60}")
    all_cats = sorted(set(y_true_test + y_pred_test))
    report = classification_report(
        y_true_test, y_pred_test,
        labels=all_cats,
        target_names=[CATEGORY_NAMES.get(c, c) for c in all_cats],
        zero_division=0,
    )
    print(report)

# ── 5. Retrain and compare ────────────────────────────────────
print(f"{'─'*60}")
print("Retraining model on current DB data...")
train_model(force=True)

correct_after = 0
for title, description, expected in TEST_CASES:
    result = get_complaint_prediction(title, description)
    if result['predicted_category'] == expected:
        correct_after += 1

after_acc = correct_after / len(TEST_CASES)
print(f"Accuracy after retrain : {after_acc*100:.1f}%  ({correct_after}/{len(TEST_CASES)})")
print(f"Change                 : {(after_acc - curated_acc)*100:+.1f}%")

# ── 6. Summary ────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
print(f"  Curated accuracy     : {curated_acc*100:.1f}%")
if real_complaints and y_true:
    print(f"  Real DB accuracy     : {acc*100:.1f}%")
print(f"  Model type           : TF-IDF + Logistic Regression")
print(f"  Categories supported : {len(CATEGORY_NAMES)}")
print(f"  Test cases           : {len(TEST_CASES)}")
print(f"{'='*60}")
