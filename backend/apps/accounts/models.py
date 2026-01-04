"""
Custom User Model for Logis Career AI Platform.
Supports Admin and Candidate user types.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model with role-based access.
    """
    
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        RECRUITER = 'recruiter', 'Recruiter'
        CANDIDATE = 'candidate', 'Candidate'
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CANDIDATE,
    )
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin_user(self):
        return self.role in [self.Role.ADMIN, self.Role.RECRUITER]
    
    @property
    def is_candidate_user(self):
        return self.role == self.Role.CANDIDATE
