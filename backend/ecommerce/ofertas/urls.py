from django.urls import path
from .views import OfertasActivasListView, OfertaDetailView, ComboListView, ComboDetailView

app_name = 'ofertas'

urlpatterns = [
    path('', OfertasActivasListView.as_view(), name='ofertas-activas'),
    path('<int:pk>/', OfertaDetailView.as_view(), name='oferta-detail'),
    path('combos/', ComboListView.as_view(), name='combo-list'),
    path('combos/<int:pk>/', ComboDetailView.as_view(), name='combo-detail'),
]