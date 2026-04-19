---
title: Advanced Generic Views
impact: LOW
impactDescription: Reduces boilerplate code and provides consistent CRUD operations
tags: django, views, generic-views, crud
---

## Advanced Generic Views

**Problem:**
Writing similar view logic repeatedly for common operations like create, read, update, delete (CRUD) leads to code duplication and maintenance issues.

**Solution:**
Extend Django's generic class-based views to customize behavior while leveraging built-in functionality for common patterns.

**Examples:**

❌ **Wrong: Manual CRUD views**
```python
# views.py - Lots of repetitive code
def article_list(request):
    articles = Article.objects.filter(published=True)
    paginate_by = 10
    page = request.GET.get('page', 1)

    paginator = Paginator(articles, paginate_by)
    try:
        articles_page = paginator.page(page)
    except PageNotAnInteger:
        articles_page = paginator.page(1)
    except EmptyPage:
        articles_page = paginator.page(paginator.num_pages)

    return render(request, 'articles/list.html', {
        'articles': articles_page
    })

def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk, published=True)
    return render(request, 'articles/detail.html', {'article': article})

def article_create(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save(commit=False)
            article.author = request.user
            article.save()
            return redirect('article_detail', pk=article.pk)
    else:
        form = ArticleForm()

    return render(request, 'articles/form.html', {'form': form})

# Similar repetitive code for update and delete views...
```

✅ **Correct: Extended generic views**
```python
# views.py - Clean, reusable views
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from django.shortcuts import get_object_or_404
from django.contrib import messages

class ArticleListView(ListView):
    """List published articles with pagination"""
    model = Article
    template_name = 'articles/list.html'
    context_object_name = 'articles'
    paginate_by = 10

    def get_queryset(self):
        """Filter for published articles only"""
        return Article.objects.filter(published=True).select_related('author')

class ArticleDetailView(DetailView):
    """Display single article"""
    model = Article
    template_name = 'articles/detail.html'

    def get_queryset(self):
        """Published articles or user's own drafts"""
        if self.request.user.is_staff:
            return Article.objects.all()
        return Article.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        """Add related articles to context"""
        context = super().get_context_data(**kwargs)
        context['related_articles'] = self.object.get_related_articles()
        return context

class ArticleCreateView(LoginRequiredMixin, CreateView):
    """Create new article"""
    model = Article
    template_name = 'articles/form.html'
    fields = ['title', 'content', 'category']

    def form_valid(self, form):
        """Set author before saving"""
        form.instance.author = self.request.user
        messages.success(self.request, 'Article created successfully!')
        return super().form_valid(form)

    def get_success_url(self):
        """Redirect to article detail"""
        return reverse_lazy('article_detail', kwargs={'pk': self.object.pk})

class ArticleUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    """Update existing article"""
    model = Article
    template_name = 'articles/form.html'
    fields = ['title', 'content', 'category', 'published']

    def test_func(self):
        """Check if user can edit this article"""
        article = self.get_object()
        return (self.request.user == article.author or
                self.request.user.is_staff)

    def get_queryset(self):
        """Allow editing own articles or all if staff"""
        if self.request.user.is_staff:
            return Article.objects.all()
        return Article.objects.filter(author=self.request.user)

    def form_valid(self, form):
        """Handle publishing logic"""
        old_article = self.get_object()
        new_article = form.save(commit=False)

        # Check if article is being published
        if not old_article.published and new_article.published:
            new_article.published_date = timezone.now()
            messages.success(self.request, 'Article published!')

        new_article.save()
        messages.success(self.request, 'Article updated successfully!')
        return super().form_valid(form)

class ArticleDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    """Delete article"""
    model = Article
    template_name = 'articles/confirm_delete.html'
    success_url = reverse_lazy('article_list')

    def test_func(self):
        """Check if user can delete this article"""
        article = self.get_object()
        return (self.request.user == article.author or
                self.request.user.is_superuser)

    def delete(self, request, *args, **kwargs):
        """Add success message"""
        messages.success(request, 'Article deleted successfully!')
        return super().delete(request, *args, **kwargs)
```

**Advanced Generic View Patterns:**
```python
# views.py - Advanced patterns
from django.views.generic.edit import FormMixin, ModelFormMixin
from django.views.generic.detail import SingleObjectMixin

class ArticleSearchMixin:
    """Mixin to add search functionality"""

    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.GET.get('q')

        if query:
            queryset = queryset.filter(
                models.Q(title__icontains=query) |
                models.Q(content__icontains=query)
            )

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['search_query'] = self.request.GET.get('q', '')
        return context

class ArticleListView(ArticleSearchMixin, ListView):
    """List view with search functionality"""
    model = Article
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.GET.get('category')

        if category:
            queryset = queryset.filter(category__slug=category)

        return queryset.filter(published=True)

# AJAX support for generic views
class AjaxableResponseMixin:
    """Mixin to add AJAX support to form views"""

    def form_invalid(self, form):
        response = super().form_invalid(form)
        if self.request.is_ajax():
            return JsonResponse(form.errors, status=400)
        return response

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.request.is_ajax():
            data = {
                'pk': self.object.pk,
                'message': 'Success'
            }
            return JsonResponse(data)
        return response

class ArticleCreateView(AjaxableResponseMixin, CreateView):
    """Create view with AJAX support"""
    model = Article
    form_class = ArticleForm

# Custom queryset methods for generic views
class PublishedArticleMixin:
    """Mixin to filter for published articles"""

    def get_queryset(self):
        return super().get_queryset().filter(published=True)

class AuthorArticleMixin:
    """Mixin to filter articles by author"""

    def get_queryset(self):
        return super().get_queryset().filter(
            author__username=self.kwargs['username']
        )

class AuthorArticleListView(PublishedArticleMixin, AuthorArticleMixin, ListView):
    """List published articles by specific author"""
    template_name = 'articles/author_list.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['author'] = get_object_or_404(User, username=self.kwargs['username'])
        return context

# Generic view for handling multiple models
class ModelActionView(SingleObjectMixin, View):
    """Generic view for model actions (publish, unpublish, etc.)"""

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        action = self.kwargs.get('action')

        if action == 'publish':
            return self._publish_object()
        elif action == 'unpublish':
            return self._unpublish_object()
        elif action == 'feature':
            return self._feature_object()

        return HttpResponseBadRequest()

    def _publish_object(self):
        """Publish the object"""
        if hasattr(self.object, 'publish'):
            self.object.publish()
        else:
            self.object.published = True
            self.object.save()

        messages.success(self.request, f'{self.object} published successfully!')
        return redirect(self.object.get_absolute_url())

    def _unpublish_object(self):
        """Unpublish the object"""
        self.object.published = False
        self.object.save()

        messages.success(self.request, f'{self.object} unpublished successfully!')
        return redirect(self.object.get_absolute_url())
```

**Testing Generic Views:**
```python
# tests/test_views.py
from django.test import TestCase
from django.urls import reverse

class ArticleViewsTest(TestCase):
    """Test generic views"""

    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@example.com', 'pass')
        self.article = Article.objects.create(
            title='Test Article',
            content='Test content',
            author=self.user,
            published=True
        )

    def test_article_list_view(self):
        """Test list view"""
        response = self.client.get(reverse('article_list'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'articles/list.html')
        self.assertContains(response, 'Test Article')

    def test_article_detail_view(self):
        """Test detail view"""
        response = self.client.get(
            reverse('article_detail', kwargs={'pk': self.article.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'articles/detail.html')
        self.assertEqual(response.context['article'], self.article)

    def test_article_create_view_requires_login(self):
        """Test create view requires authentication"""
        # Not logged in
        response = self.client.get(reverse('article_create'))
        self.assertRedirects(response, '/accounts/login/?next=/articles/create/')

        # Logged in
        self.client.login(username='testuser', password='pass')
        response = self.client.get(reverse('article_create'))
        self.assertEqual(response.status_code, 200)

    def test_article_create_view(self):
        """Test successful article creation"""
        self.client.login(username='testuser', password='pass')

        response = self.client.post(reverse('article_create'), {
            'title': 'New Article',
            'content': 'New content',
            'category': 'tech'
        })

        self.assertEqual(response.status_code, 302)  # Redirect after success
        self.assertTrue(Article.objects.filter(title='New Article').exists())
```

**Common mistakes:**
- Not customizing generic views when needed
- Overriding too many methods unnecessarily
- Not using mixins to share functionality
- Mixing function-based and class-based views inconsistently
- Not testing generic view customizations
- Creating custom views when generic ones would work

**When to apply:**
- Implementing CRUD operations
- Creating list/detail views with pagination
- Building forms for model operations
- Sharing functionality across similar views
- Rapid prototyping of common patterns
- Ensuring consistent view behavior