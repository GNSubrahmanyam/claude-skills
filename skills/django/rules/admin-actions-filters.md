# Admin Actions Filters (MEDIUM)

**Impact:** MEDIUM - Improves admin productivity and functionality

**Problem:**
Default Django admin provides basic functionality but lacks custom actions and advanced filtering that power users need for efficient content management.

**Solution:**
Implement custom admin actions and filters to provide bulk operations and advanced data management capabilities.

**Examples:**

❌ **Wrong: Basic admin without enhancements**
```python
# admin.py - Too basic, hard to use
from django.contrib import admin
from .models import Article

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'published_date']
    # No custom actions or advanced filters!
```

✅ **Correct: Enhanced admin with actions and filters**
```python
# admin.py
from django.contrib import admin
from django.db.models import Count, Q
from django.utils.html import format_html
from django.urls import reverse
from django.contrib import messages
from .models import Article, Author, Category

@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    # Enhanced list display
    list_display = [
        'get_full_name', 'email', 'article_count',
        'is_active', 'date_joined', 'get_actions'
    ]
    list_display_links = ['get_full_name', 'email']

    # Advanced filtering
    list_filter = [
        'is_active',
        'date_joined',
        ('article_count', admin.EmptyFieldListFilter),  # Custom filter
        ('date_joined', admin.DateFieldListFilter),  # Date range filter
    ]

    # Search capabilities
    search_fields = ['first_name', 'last_name', 'email', 'username']
    search_help_text = "Search by name, email, or username"

    # Custom actions
    actions = [
        'activate_users',
        'deactivate_users',
        'export_selected_users'
    ]

    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Name'
    get_full_name.admin_order_field = 'first_name'

    def article_count(self, obj):
        url = reverse('admin:articles_article_changelist') + f'?author__id__exact={obj.id}'
        return format_html('<a href="{}">{}</a>', url, obj.articles.count())
    article_count.short_description = 'Articles'

    def get_actions(self, obj):
        return format_html(
            '<a href="{}" class="button">Edit Articles</a>',
            reverse('admin:articles_article_changelist') + f'?author__id__exact={obj.id}'
        )
    get_actions.short_description = 'Actions'

    # Custom filters
    class ArticleCountFilter(admin.SimpleListFilter):
        title = 'article count'
        parameter_name = 'article_count'

        def lookups(self, request, model_admin):
            return [
                ('0', 'No articles'),
                ('1-5', '1-5 articles'),
                ('6-20', '6-20 articles'),
                ('20+', '20+ articles'),
            ]

        def queryset(self, request, queryset):
            if self.value() == '0':
                return queryset.annotate(
                    article_count=Count('articles')
                ).filter(article_count=0)
            elif self.value() == '1-5':
                return queryset.annotate(
                    article_count=Count('articles')
                ).filter(article_count__range=(1, 5))
            elif self.value() == '6-20':
                return queryset.annotate(
                    article_count=Count('articles')
                ).filter(article_count__range=(6, 20))
            elif self.value() == '20+':
                return queryset.annotate(
                    article_count=Count('articles')
                ).filter(article_count__gt=20)

    # Apply custom filter
    list_filter = [
        'is_active',
        'date_joined',
        'ArticleCountFilter',  # Custom filter class
    ]

    # Action implementations
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{updated} users activated successfully.'
        )
    activate_users.short_description = 'Activate selected users'

    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{updated} users deactivated successfully.'
        )
    deactivate_users.short_description = 'Deactivate selected users'

    def export_selected_users(self, request, queryset):
        """Export selected users to CSV"""
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users.csv"'

        writer = csv.writer(response)
        writer.writerow(['Name', 'Email', 'Date Joined', 'Article Count'])

        for user in queryset.annotate(article_count=Count('articles')):
            writer.writerow([
                user.get_full_name(),
                user.email,
                user.date_joined,
                user.article_count
            ])

        self.message_user(request, f'Exported {queryset.count()} users.')
        return response
    export_selected_users.short_description = 'Export selected users to CSV'

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    # Comprehensive display and filtering
    list_display = [
        'title', 'author_link', 'category',
        'get_status_display', 'published_date',
        'word_count', 'view_count'
    ]

    list_editable = ['category']
    list_filter = [
        'published',
        'published_date',
        'category',
        'author',
        ('word_count', admin.RangeFilter),
    ]

    search_fields = ['title', 'content', 'author__first_name', 'author__last_name']
    date_hierarchy = 'published_date'
    ordering = ['-published_date']

    # Bulk actions
    actions = [
        'publish_articles',
        'unpublish_articles',
        'feature_articles',
        'unfeature_articles',
        'bulk_category_change',
        'export_to_csv'
    ]

    def author_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.author.id])
        return format_html('<a href="{}">{}</a>', url, obj.author.get_full_name())
    author_link.short_description = 'Author'

    def get_status_display(self, obj):
        if obj.published:
            return format_html('<span style="color: green;">✓ Published</span>')
        elif obj.featured:
            return format_html('<span style="color: orange;">★ Featured</span>')
        return format_html('<span style="color: gray;">Draft</span>')
    get_status_display.short_description = 'Status'

    def word_count(self, obj):
        return len(obj.content.split())
    word_count.short_description = 'Words'

    # Action implementations
    def publish_articles(self, request, queryset):
        updated = queryset.update(published=True, published_date=timezone.now())
        self.message_user(request, f'{updated} articles published.')
    publish_articles.short_description = 'Publish selected articles'

    def unpublish_articles(self, request, queryset):
        updated = queryset.update(published=False)
        self.message_user(request, f'{updated} articles unpublished.')
    unpublish_articles.short_description = 'Unpublish selected articles'

    def feature_articles(self, request, queryset):
        updated = queryset.update(featured=True)
        self.message_user(request, f'{updated} articles featured.')
    feature_articles.short_description = 'Feature selected articles'

    def unfeature_articles(self, request, queryset):
        updated = queryset.update(featured=False)
        self.message_user(request, f'{updated} articles unfeatured.')
    unfeature_articles.short_description = 'Unfeature selected articles'

    def bulk_category_change(self, request, queryset):
        """Change category for multiple articles"""
        if 'apply' in request.POST:
            category_id = request.POST.get('category')
            category = Category.objects.get(id=category_id)
            updated = queryset.update(category=category)
            self.message_user(request, f'{updated} articles moved to {category.name}.')
            return None

        return render(request, 'admin/bulk_category_change.html', {
            'articles': queryset,
            'categories': Category.objects.all(),
        })
    bulk_category_change.short_description = 'Change category for selected articles'

    def export_to_csv(self, request, queryset):
        """Export articles to CSV"""
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="articles.csv"'

        writer = csv.writer(response)
        writer.writerow(['Title', 'Author', 'Category', 'Published', 'Word Count'])

        for article in queryset.select_related('author', 'category'):
            writer.writerow([
                article.title,
                article.author.get_full_name(),
                article.category.name if article.category else '',
                article.published_date.strftime('%Y-%m-%d') if article.published_date else '',
                len(article.content.split())
            ])

        return response
    export_to_csv.short_description = 'Export selected articles to CSV'
```

**Common mistakes:**
- Not implementing useful bulk actions
- Missing advanced filtering options
- Not customizing list_display for important fields
- Poor search field configuration
- Not providing export functionality
- Overwhelming users with too many options

**When to apply:**
- Customizing admin for content managers
- Implementing bulk operations
- Adding advanced filtering and search
- Building export functionality
- Improving admin user experience