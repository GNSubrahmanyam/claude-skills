---
title: REST Framework API Design
impact: MEDIUM-HIGH
impactDescription: Enables scalable and maintainable API development
tags: django, api, rest-framework, serialization, authentication
---

## REST Framework API Design

**Problem:**
Manual API development leads to inconsistent patterns, security issues, and maintenance overhead. Without proper API frameworks, teams struggle with serialization, authentication, and documentation.

**Solution:**
Use Django REST Framework for consistent API development with proper serialization, authentication, and documentation.

**Examples:**

❌ **Wrong: Manual API development**
```python
# views.py - Manual API views
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def article_list_api(request):
    if request.method == 'GET':
        articles = Article.objects.filter(published=True)
        data = []
        for article in articles:
            data.append({
                'id': article.id,
                'title': article.title,
                'content': article.content,
                'author': article.author.username,
                'published_date': article.published_date.isoformat(),
            })
        return JsonResponse({'articles': data})

    elif request.method == 'POST':
        # Manual parsing and validation - error prone
        try:
            data = json.loads(request.body)
            article = Article.objects.create(
                title=data['title'],
                content=data['content'],
                author=request.user
            )
            return JsonResponse({'id': article.id}, status=201)
        except (KeyError, json.JSONDecodeError):
            return JsonResponse({'error': 'Invalid data'}, status=400)

# No authentication, no documentation, no validation
```

✅ **Correct: Django REST Framework**
```python
# serializers.py
from rest_framework import serializers
from .models import Article

class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    word_count = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'content', 'slug', 'author', 'author_name',
            'category', 'published', 'published_date', 'word_count'
        ]
        read_only_fields = ['author', 'slug']

    def get_word_count(self, obj):
        return len(obj.content.split())

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters")
        return value.strip()

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

# views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Article
from .serializers import ArticleSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Article.objects.select_related('author', 'category')

        # Filter by published status
        published = self.request.query_params.get('published', None)
        if published is not None:
            queryset = queryset.filter(published=published.lower() == 'true')

        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category__slug=category)

        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        article = self.get_object()

        if article.author != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        article.published = True
        article.published_date = timezone.now()
        article.save()

        serializer = self.get_serializer(article)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get article statistics"""
        stats = Article.objects.aggregate(
            total=Count('id'),
            published=Count('id', filter=Q(published=True)),
            draft=Count('id', filter=Q(published=False)),
        )
        return Response(stats)

# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet

router = DefaultRouter()
router.register(r'articles', ArticleViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/', include('rest_framework.urls')),
]

# settings.py
INSTALLED_APPS = [
    'rest_framework',
    'rest_framework.authtoken',  # For token auth
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # For development
    ],
    'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.coreapi.AutoSchema',
}
```

**Advanced API Patterns:**
```python
# Advanced serialization
from rest_framework import serializers
from drf_writable_nested import WritableNestedModelSerializer

class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'article_count']

class ArticleDetailSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = serializers.StringRelatedField(many=True, read_only=True)
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'content', 'slug', 'author', 'category',
            'tags', 'published', 'published_date', 'comments'
        ]

    def get_comments(self, obj):
        from .serializers import CommentSerializer
        comments = obj.comments.filter(approved=True)[:5]
        return CommentSerializer(comments, many=True).data

# Custom permissions
from rest_framework import permissions

class IsAuthorOrReadOnly(permissions.BasePermission):
    """Custom permission for object-level access"""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.author == request.user

class ArticlePermissions(permissions.BasePermission):
    """Complex permission logic"""

    def has_permission(self, request, view):
        # Allow GET, HEAD, OPTIONS for everyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # For other methods, user must be authenticated
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # Authors can edit their own articles
        if obj.author == request.user:
            return True

        # Staff can edit all articles
        if request.user.is_staff:
            return True

        return False

# API documentation with drf-yasg
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

class ArticleViewSet(viewsets.ModelViewSet):
    @swagger_auto_schema(
        operation_description="List all published articles",
        manual_parameters=[
            openapi.Parameter(
                'category',
                openapi.IN_QUERY,
                description="Filter by category slug",
                type=openapi.TYPE_STRING
            ),
        ],
        responses={200: ArticleSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Create a new article",
        request_body=ArticleSerializer,
        responses={201: ArticleSerializer}
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
```

**Common mistakes:**
- Using manual JSON responses instead of serializers
- Not implementing proper authentication and permissions
- Missing API documentation
- Not handling validation errors properly
- Creating inconsistent API patterns
- Not implementing proper pagination and filtering

**When to apply:**
- Building web APIs for frontend applications
- Creating mobile app backends
- Implementing microservices communication
- Providing third-party API access
- During full-stack application development