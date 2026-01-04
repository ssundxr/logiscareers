"""
Serializers for User accounts.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.
    """
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'profile_picture', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Public registration only allows 'candidate' role for security.
    Admin/recruiter accounts must be created by existing admins.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone'
        ]
    
    def validate_role(self, value):
        """Only allow 'candidate' and 'recruiter' roles for public registration."""
        request = self.context.get('request')
        # Only allow admin role if user is authenticated admin
        if value == 'admin':
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError(
                    'Only authenticated administrators can create admin accounts.'
                )
            if not getattr(request.user, 'is_admin_user', False):
                raise serializers.ValidationError(
                    'Only administrators can create admin accounts.'
                )
        # Allow candidate and recruiter for public registration
        elif value not in ['candidate', 'recruiter']:
            raise serializers.ValidationError(
                'Invalid role. Choose either "candidate" or "recruiter".'
            )
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields do not match.'
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value
