from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta, datetime

from apps.complaints.models import Complaint, Feedback
from apps.accounts.models import User, OfficerProfile
from apps.departments.models import Department
from apps.accounts.permissions import IsDepartmentHeadOrAbove, IsSuperAdmin


def _complaint_qs(dept_id=None):
    qs = Complaint.objects
    if dept_id:
        try:
            dept = Department.objects(id=dept_id).first()
            if dept:
                qs = qs.filter(department=dept)
        except Exception:
            pass
    return qs


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        if user.role == 'citizen':
            qs = Complaint.objects(citizen=user)
            return Response({
                'total': qs.count(),
                'submitted': qs.filter(status='submitted').count(),
                'in_progress': qs.filter(status__in=['assigned', 'accepted', 'work_started', 'in_progress']).count(),
                'resolved': qs.filter(status='resolved').count(),
                'closed': qs.filter(status='closed').count(),
                'rejected': qs.filter(status='rejected').count(),
                'this_month': qs.filter(submitted_at__gte=month_start).count(),
            })

        if user.role == 'officer':
            qs = Complaint.objects(assigned_officer=user)
            resolved_qs = list(qs.filter(status__in=['resolved', 'closed'], resolved_at__ne=None)
                               .only('submitted_at', 'resolved_at'))
            avg_hours = None
            if resolved_qs:
                secs = sum((c.resolved_at - c.submitted_at).total_seconds()
                           for c in resolved_qs if c.resolved_at and c.submitted_at)
                avg_hours = round(secs / 3600 / len(resolved_qs), 1)
            return Response({
                'total_assigned': qs.count(),
                'pending': qs.filter(status__nin=['resolved', 'closed', 'rejected']).count(),
                'resolved': qs.filter(status__in=['resolved', 'closed']).count(),
                'this_month': qs.filter(submitted_at__gte=month_start).count(),
                'avg_resolution_hours': avg_hours,
            })

        if user.role == 'department_head':
            profile = OfficerProfile.objects(user=user).first()
            dept = profile.department if profile else None
            qs = Complaint.objects(department=dept) if dept else Complaint.objects.none()
            return Response({
                'total': qs.count(),
                'pending': qs.filter(status__nin=['resolved', 'closed', 'rejected']).count(),
                'resolved': qs.filter(status__in=['resolved', 'closed']).count(),
                'this_month': qs.filter(submitted_at__gte=month_start).count(),
            })

        # Super Admin
        qs = Complaint.objects
        return Response({
            'total_complaints':   qs.count(),
            'submitted':          qs.filter(status='submitted').count(),
            'in_progress':        qs.filter(status__in=['assigned', 'accepted', 'work_started', 'in_progress']).count(),
            'resolved':           qs.filter(status='resolved').count(),
            'closed':             qs.filter(status='closed').count(),
            'rejected':           qs.filter(status='rejected').count(),
            'emergency':          qs.filter(is_emergency=True, status__nin=['resolved', 'closed', 'rejected']).count(),
            'total_users':        User.objects.count(),
            'total_citizens':     User.objects(role='citizen').count(),
            'total_officers':     User.objects(role='officer').count(),
            'total_departments':  Department.objects.count(),
            'this_month':         qs.filter(submitted_at__gte=month_start).count(),
        })


class ComplaintTrendsView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        dept_id = request.query_params.get('department')
        now = timezone.now()

        if period == 'daily':
            start = now - timedelta(days=30)
            fmt = '%Y-%m-%d'
            trunc = lambda d: d.strftime(fmt)
        elif period == 'weekly':
            start = now - timedelta(weeks=12)
            fmt = '%Y-W%W'
            trunc = lambda d: d.strftime(fmt)
        else:
            start = now - timedelta(days=365)
            fmt = '%Y-%m'
            trunc = lambda d: d.strftime(fmt)

        qs = _complaint_qs(dept_id).filter(submitted_at__gte=start)
        counts = {}
        for c in qs.only('submitted_at'):
            key = trunc(c.submitted_at)
            counts[key] = counts.get(key, 0) + 1

        return Response(sorted(
            [{'period': k, 'count': v} for k, v in counts.items()],
            key=lambda x: x['period']
        ))


class CategoryDistributionView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        dept_id = request.query_params.get('department')
        qs = _complaint_qs(dept_id).filter(category__ne=None)
        counts = {}
        for c in qs.only('category'):
            try:
                cat = c.category
                key = str(cat.id)
                if key not in counts:
                    counts[key] = {'category': cat.name, 'color': cat.color, 'count': 0}
                counts[key]['count'] += 1
            except Exception:
                pass
        return Response(sorted(counts.values(), key=lambda x: x['count'], reverse=True))


class DepartmentPerformanceView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        result = []
        for dept in Department.objects(is_active=True):
            total    = Complaint.objects(department=dept).count()
            resolved = Complaint.objects(department=dept, status__in=['resolved', 'closed']).count()
            result.append({
                'department':      dept.name,
                'total':           total,
                'resolved':        resolved,
                'pending':         total - resolved,
                'resolution_rate': round(resolved / total * 100, 1) if total > 0 else 0,
            })
        return Response(sorted(result, key=lambda x: x['resolution_rate'], reverse=True))


class OfficerPerformanceView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        from django.utils.timezone import make_aware, is_naive
        import pytz

        def _to_aware(dt):
            if dt is None: return None
            return make_aware(dt, pytz.UTC) if is_naive(dt) else dt

        dept_id = request.query_params.get('department')
        officers_qs = OfficerProfile.objects
        if dept_id:
            try:
                dept = Department.objects(id=dept_id).first()
                if dept:
                    officers_qs = OfficerProfile.objects(department=dept)
                else:
                    return Response([])
            except Exception:
                return Response([])

        result = []
        for officer in officers_qs:
            qs       = Complaint.objects(assigned_officer=officer.user)
            total    = qs.count()
            resolved = qs.filter(status__in=['resolved', 'closed']).count()

            res_list = list(qs.filter(status__in=['resolved', 'closed'], resolved_at__ne=None)
                            .only('submitted_at', 'resolved_at'))
            avg_hrs = None
            sla_breaches = 0
            if res_list:
                total_secs = 0
                for c in res_list:
                    s = _to_aware(c.submitted_at)
                    r = _to_aware(c.resolved_at)
                    if s and r:
                        h = (r - s).total_seconds() / 3600
                        total_secs += h
                        if h > 96:
                            sla_breaches += 1
                avg_hrs = round(total_secs / len(res_list), 1)

            feedbacks  = list(Feedback.objects(complaint__in=list(qs)).only('rating'))
            avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else None

            try:
                dept_name = officer.department.name if officer.department else ''
            except Exception:
                dept_name = ''

            result.append({
                'officer_id':           str(officer.user.id),
                'name':                 officer.user.full_name,
                'department':           dept_name,
                'employee_id':          officer.employee_id,
                'total_assigned':       total,
                'resolved':             resolved,
                'pending':              total - resolved,
                'resolution_rate':      round(resolved / total * 100, 1) if total > 0 else 0,
                'avg_resolution_hours': avg_hrs,
                'sla_breaches':         sla_breaches,
                'avg_rating':           avg_rating,
            })
        return Response(sorted(result, key=lambda x: x['resolution_rate'], reverse=True))


class StatusDistributionView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        dept_id = request.query_params.get('department')
        qs = _complaint_qs(dept_id)
        counts = {}
        for c in qs.only('status'):
            counts[c.status] = counts.get(c.status, 0) + 1
        return Response(sorted(
            [{'status': k, 'count': v} for k, v in counts.items()],
            key=lambda x: x['count'], reverse=True
        ))


class PriorityDistributionView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        dept_id = request.query_params.get('department')
        qs = _complaint_qs(dept_id)
        counts = {}
        for c in qs.only('priority'):
            counts[c.priority] = counts.get(c.priority, 0) + 1
        return Response(sorted(
            [{'priority': k, 'count': v} for k, v in counts.items()],
            key=lambda x: x['count'], reverse=True
        ))


class ResolutionTimeView(APIView):
    """Average resolution time per category and per department."""
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        from django.utils.timezone import make_aware, is_naive
        import pytz

        def _to_aware(dt):
            if dt is None: return None
            return make_aware(dt, pytz.UTC) if is_naive(dt) else dt

        dept_id = request.query_params.get('department')
        qs = _complaint_qs(dept_id).filter(
            status__in=['resolved', 'closed'],
            resolved_at__ne=None,
            submitted_at__ne=None,
        )

        by_category   = {}
        by_department = {}

        for c in qs.only('category', 'department', 'submitted_at', 'resolved_at'):
            submitted = _to_aware(c.submitted_at)
            resolved  = _to_aware(c.resolved_at)
            if not submitted or not resolved:
                continue
            try:
                hours = (resolved - submitted).total_seconds() / 3600
            except Exception:
                continue

            try: cat_name = c.category.name if c.category else 'Unknown'
            except Exception: cat_name = 'Unknown'
            by_category.setdefault(cat_name, []).append(hours)

            try: dept_name = c.department.name if c.department else 'Unknown'
            except Exception: dept_name = 'Unknown'
            by_department.setdefault(dept_name, []).append(hours)

        return Response({
            'by_category': sorted(
                [{'category': k, 'avg_hours': round(sum(v)/len(v), 1), 'count': len(v)}
                 for k, v in by_category.items()],
                key=lambda x: x['avg_hours']
            ),
            'by_department': sorted(
                [{'department': k, 'avg_hours': round(sum(v)/len(v), 1), 'count': len(v)}
                 for k, v in by_department.items()],
                key=lambda x: x['avg_hours']
            ),
        })


class SLABreachView(APIView):
    """Complaints that breached their SLA (resolved late or still pending past SLA)."""
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        from apps.complaints.ml_predictions import CATEGORY_BASE_HOURS
        from django.utils.timezone import make_aware, is_naive
        import pytz

        dept_id = request.query_params.get('department')
        now = timezone.now()

        def _to_aware(dt):
            """Convert naive datetime to aware, or return as-is if already aware."""
            if dt is None:
                return None
            if is_naive(dt):
                return make_aware(dt, pytz.UTC)
            return dt

        qs = _complaint_qs(dept_id).filter(status__nin=['rejected'])

        breached, on_time, pending_overdue = 0, 0, 0

        for c in qs.only('status', 'category', 'submitted_at', 'resolved_at', 'priority'):
            try:
                slug = c.category.slug if c.category else 'others'
            except Exception:
                slug = 'others'
            sla_h = CATEGORY_BASE_HOURS.get(slug, 60)
            if c.priority == 'high':      sla_h = max(12, sla_h - 12)
            if c.priority == 'emergency': sla_h = max(4, sla_h - 30)

            submitted = _to_aware(c.submitted_at)
            resolved  = _to_aware(c.resolved_at)

            if c.status in ['resolved', 'closed']:
                if resolved and submitted:
                    actual_h = (resolved - submitted).total_seconds() / 3600
                    if actual_h > sla_h:
                        breached += 1
                    else:
                        on_time += 1
            else:
                if submitted:
                    elapsed_h = (now - submitted).total_seconds() / 3600
                    if elapsed_h > sla_h:
                        pending_overdue += 1

        total_resolved = breached + on_time
        compliance_rate = round(on_time / total_resolved * 100, 1) if total_resolved else 0

        return Response({
            'breached':        breached,
            'on_time':         on_time,
            'pending_overdue': pending_overdue,
            'compliance_rate': compliance_rate,
        })


class MLInsightsView(APIView):
    """ML-powered insights: category prediction accuracy, common patterns."""
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        from apps.complaints.ml_predictions import _get_model, CATEGORY_NAMES
        model = _get_model()

        complaints = list(
            Complaint.objects(category__ne=None)
            .only('title', 'description', 'category', 'status')
            .limit(200)
        )

        if not complaints:
            return Response({
                'model_active': model is not None,
                'accuracy': None,
                'total_evaluated': 0,
                'top_categories': [],
            })

        import re
        def clean(t): return re.sub(r'[^a-z0-9\s]', ' ', (t or '').lower())

        correct = 0
        cat_counts = {}

        for c in complaints:
            try:
                actual_slug = c.category.slug
            except Exception:
                continue

            cat_counts[actual_slug] = cat_counts.get(actual_slug, 0) + 1

            if model is not None:
                text = clean(f'{c.title} {c.description}')
                try:
                    predicted = model.predict([text])[0]
                    if predicted == actual_slug:
                        correct += 1
                except Exception:
                    pass

        total = len(complaints)
        accuracy = round(correct / total * 100, 1) if model and total else None

        top_categories = sorted(
            [{'slug': k, 'name': CATEGORY_NAMES.get(k, k), 'count': v}
             for k, v in cat_counts.items()],
            key=lambda x: x['count'], reverse=True
        )[:8]

        return Response({
            'model_active':    model is not None,
            'accuracy':        accuracy,
            'total_evaluated': total,
            'top_categories':  top_categories,
        })


class ExportReportView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        fmt      = request.query_params.get('format', 'csv')
        dept_id  = request.query_params.get('department')
        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')

        qs = _complaint_qs(dept_id)
        if date_from:
            qs = qs.filter(submitted_at__gte=datetime.strptime(date_from, '%Y-%m-%d'))
        if date_to:
            qs = qs.filter(submitted_at__lte=datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59))

        if fmt == 'csv':    return self._export_csv(qs)
        if fmt == 'excel':  return self._export_excel(qs)
        if fmt == 'pdf':    return self._export_pdf(qs)
        return Response({'error': 'Invalid format'}, status=400)

    def _rows(self, qs):
        rows = []
        for c in qs:
            try: citizen = c.citizen.full_name if not c.is_anonymous else 'Anonymous'
            except Exception: citizen = 'Unknown'
            try: category = c.category.name if c.category else ''
            except Exception: category = ''
            try: department = c.department.name if c.department else ''
            except Exception: department = ''
            try: officer = c.assigned_officer.full_name if c.assigned_officer else ''
            except Exception: officer = ''
            rows.append([
                c.complaint_id, c.title, citizen, category, department, officer,
                c.status, c.priority,
                'Yes' if c.is_emergency else 'No',
                c.area or '', c.city or '',
                c.submitted_at.strftime('%Y-%m-%d %H:%M') if c.submitted_at else '',
                c.resolved_at.strftime('%Y-%m-%d %H:%M') if c.resolved_at else '',
            ])
        return rows

    def _headers(self):
        return ['Complaint ID', 'Title', 'Citizen', 'Category', 'Department', 'Officer',
                'Status', 'Priority', 'Emergency', 'Area', 'City', 'Submitted At', 'Resolved At']

    def _export_csv(self, qs):
        import csv
        from io import StringIO
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(self._headers())
        writer.writerows(self._rows(qs))
        response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="complaints_report_{__import__("datetime").date.today()}.csv"'
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    def _export_excel(self, qs):
        import openpyxl
        from io import BytesIO
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Complaints Report'
        ws.append(self._headers())
        for row in self._rows(qs):
            ws.append(row)
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="complaints_report_{__import__("datetime").date.today()}.xlsx"'
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    def _export_pdf(self, qs):
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from io import BytesIO
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        styles = getSampleStyleSheet()
        elements = [Paragraph('Complaints Report', styles['Title'])]
        headers = ['ID', 'Title', 'Citizen', 'Category', 'Status', 'Priority', 'City', 'Submitted']
        data = [headers] + [
            [r[0], r[1][:30], r[2][:20], r[3][:15], r[6], r[7], r[10], r[11]]
            for r in self._rows(qs)[:500]
        ]
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
            ('FONTSIZE',   (0, 0), (-1, 0), 9),
            ('FONTSIZE',   (0, 1), (-1, -1), 7),
            ('GRID',       (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="complaints_report_{__import__("datetime").date.today()}.pdf"'
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response


class HeatmapDataView(APIView):
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        qs = Complaint.objects(latitude__ne=None, longitude__ne=None).only(
            'latitude', 'longitude', 'priority', 'status', 'category'
        )[:500]
        result = []
        for c in qs:
            try: cat_name  = c.category.name if c.category else ''
            except Exception: cat_name = ''
            try: cat_color = c.category.color if c.category else ''
            except Exception: cat_color = ''
            result.append({
                'latitude':       float(c.latitude),
                'longitude':      float(c.longitude),
                'priority':       c.priority,
                'status':         c.status,
                'category__name': cat_name,
                'category__color': cat_color,
            })
        return Response(result)
