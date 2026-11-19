from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UsuarioManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El correo electrónico es obligatorio')
        email = self.normalize_email(email)
        extra_fields.setdefault('first_name', username or 'Usuario')
        extra_fields.setdefault('last_name', 'Cliente')
        extra_fields.setdefault('direccion', 'Sin especificar')
        extra_fields.setdefault('codigo_postal', '3260')
        extra_fields.setdefault('is_active', True)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(username, email, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    id = models.AutoField(primary_key=True, db_column='id_usuario')
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=50, db_column='nombre', default='', blank=True)
    last_name = models.CharField(max_length=50, db_column='apellido', default='', blank=True)
    email = models.EmailField(max_length=100, unique=True, db_column='correo')
    direccion = models.CharField(max_length=150, db_column='direccion', default='Sin especificar', blank=True)
    codigo_postal = models.CharField(max_length=10, db_column='codigo_postal', default='3260', blank=True)
    is_staff = models.BooleanField(default=False, db_column='es_admin')
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    telefono = models.CharField(max_length=20, null=True, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    ciudad = models.CharField(max_length=100, null=True, blank=True)
    comuna = models.CharField(max_length=100, null=True, blank=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'usuario'
        managed = False
        ordering = ['username']

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name or self.username

    def save(self, *args, **kwargs):
        if not self.first_name:
            self.first_name = (self.username or 'Usuario')[:50]
        if not self.last_name:
            self.last_name = 'Cliente'
        if not self.direccion:
            self.direccion = 'Sin especificar'
        if not self.codigo_postal:
            self.codigo_postal = '3260'
        super().save(*args, **kwargs)

    def __str__(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username or self.email
