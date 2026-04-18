# URLs Reverse URLs (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Ensures maintainable and reliable URL generation

**Problem:**
Hardcoded URLs throughout templates and views break when URLs change, require manual updates, and are error-prone. Applications become difficult to maintain and refactor.

**Solution:**
Always use Django's `reverse()` function and `{% url %}` template tag for URL generation. Never hardcode URLs in templates or views.

**Examples:**

❌ **Wrong: Hardcoded URLs**
```python
# views.py - HARDCODED URLs
def article_create(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save()
            # Hardcoded URL - breaks if URL pattern changes
            return redirect('/articles/')  # BAD!

def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk)
    return render(request, 'article/detail.html', {
        'article': article,
        # More hardcoded URLs in context
        'edit_url': f'/articles/{pk}/edit/',
        'delete_url': f'/articles/{pk}/delete/',
    })

# templates/article/detail.html - MORE hardcoded URLs
<a href="/articles/{{ article.pk }}/edit/">Edit</a>
<a href="/articles/{{ article.pk }}/delete/">Delete</a>
<a href="/articles/">Back to Articles</a>
```

✅ **Correct: Using reverse() and {% url %}**
```python
# views.py - Proper URL reversal
from django.urls import reverse
from django.shortcuts import redirect

def article_create(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save()
            # Use reverse() - always up-to-date
            return redirect(reverse('articles:detail', kwargs={'pk': article.pk}))

def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk)
    return render(request, 'article/detail.html', {
        'article': article,
        # Use reverse() in context
        'edit_url': reverse('articles:edit', kwargs={'pk': pk}),
        'delete_url': reverse('articles:delete', kwargs={'pk': pk}),
    })

# models.py - get_absolute_url() method
class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)

    def get_absolute_url(self):
        """Canonical URL for this object"""
        from django.urls import reverse
        return reverse('articles:detail', kwargs={'pk': self.pk})

# templates/article/detail.html - Proper URL tags
<a href="{% url 'articles:edit' article.pk %}">Edit</a>
<a href="{% url 'articles:delete' article.pk %}">Delete</a>
<a href="{% url 'articles:list' %}">Back to Articles</a>

{# With query parameters #}
<a href="{% url 'articles:list' %}?category={{ category.slug }}">Filter by {{ category.name }}</a>

{# In forms #}
<form action="{% url 'articles:create' %}" method="post">
    {% csrf_token %}
    <!-- form fields -->
</form>
```

**Advanced URL reversal patterns:**
```python
# Complex URL patterns with multiple parameters
def article_by_date(request, year, month, day):
    articles = Article.objects.filter(
        published_date__year=year,
        published_date__month=month,
        published_date__day=day
    )
    return render(request, 'articles/by_date.html', {
        'articles': articles,
        'date': date(year, month, day),
    })

# URL reversal with multiple kwargs
url = reverse('articles:by_date', kwargs={
    'year': 2024,
    'month': 1,
    'day': 15
})
# Result: /articles/2024/01/15/

# Conditional URL generation
def get_next_article_url(article):
    """Get URL for next article in series"""
    next_article = Article.objects.filter(
        series=article.series,
        published_date__gt=article.published_date
    ).first()

    if next_article:
        return reverse('articles:detail', kwargs={'pk': next_article.pk})
    return None

# Template conditional URLs
{% with next_url=article|get_next_article_url %}
  {% if next_url %}
    <a href="{{ next_url }}">Next Article</a>
  {% endif %}
{% endwith %}

# URL reversal in forms and redirects
class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'content']

    def save(self, commit=True):
        article = super().save(commit=False)
        if commit:
            article.save()
        return article

# In view
def create_article(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save()
            # Redirect using get_absolute_url()
            return redirect(article)
    else:
        form = ArticleForm()
    return render(request, 'articles/create.html', {'form': form})
```

**URL reversal utilities:**
```python
# utils.py
from django.urls import reverse
from django.http import Http404

def get_object_url_or_404(view_name, *args, **kwargs):
    """Get URL for object or raise 404 if reverse fails"""
    try:
        return reverse(view_name, args=args, kwargs=kwargs)
    except:
        raise Http404("URL not found")

def build_url_with_params(view_name, params=None, **kwargs):
    """Build URL with query parameters"""
    base_url = reverse(view_name, kwargs=kwargs)
    if params:
        from urllib.parse import urlencode
        query_string = urlencode(params)
        return f"{base_url}?{query_string}"
    return base_url

# Template tags for URL building
from django import template
from django.urls import reverse, NoReverseMatch

register = template.Library()

@register.simple_tag(takes_context=True)
def build_url(context, view_name, **kwargs):
    """Template tag for building URLs with context"""
    try:
        return reverse(view_name, kwargs=kwargs)
    except NoReverseMatch:
        return '#url-error'

# Usage in templates
{% load url_utils %}
<a href="{% build_url 'articles:detail' pk=article.pk %}">View Article</a>
```

**Common mistakes:**
- Hardcoding URLs in templates and views
- Not using URL namespaces properly
- Forgetting to handle URL reversal failures
- Not implementing get_absolute_url() on models
- Using string concatenation for URL building
- Not updating hardcoded URLs when patterns change

**When to apply:**
- Writing any template or view code
- Implementing redirects and links
- Building navigation and breadcrumbs
- Creating SEO-friendly URLs
- During refactoring and URL pattern changes