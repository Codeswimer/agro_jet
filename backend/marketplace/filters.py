"""Filtersets for marketplace catalog browsing."""
import django_filters

from .models import CorporateBuyer, ImportPool, ProduceListing


class CorporateBuyerFilterSet(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search', help_text='Free-text search')
    category = django_filters.CharFilter(field_name='category')

    class Meta:
        model = CorporateBuyer
        fields = ['category', 'verified_buyer']

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(company_name__icontains=value)
            | Q(raw_material_needed__icontains=value)
            | Q(location__icontains=value)
        )


class ProduceFilterSet(django_filters.FilterSet):
    crop = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = ProduceListing
        fields = ['category', 'is_active']


class ImportPoolFilterSet(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = ImportPool
        fields = ['is_active']

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(title__icontains=value) | Q(origin__icontains=value) | Q(category__icontains=value)
        )
