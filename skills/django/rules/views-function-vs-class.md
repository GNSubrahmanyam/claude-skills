# Views Function vs Class (HIGH)

**Impact:** HIGH - Ensures maintainable and consistent view architecture

**Problem:**
Choosing the wrong view type can lead to code duplication, poor maintainability, and inconsistent patterns. Function-based views are simpler but can become unwieldy, while class-based views provide structure but can be overkill for simple cases.

**Solution:**
Use function-based views for simple logic and class-based views for complex views with multiple HTTP methods, mixins, or reusable components. Follow Django's conventions for each type.

**Examples:**

✅ **Correct: Simple function-based view**
```python
def article_list(request):
    """Simple view - function-based is appropriate"""
    articles = Article.objects.all()
    return render(request, 'articles/list.html', {'articles': articles})

# Good: Class-based for complex logic
class ArticleDetailView(DetailView):
    model = Article
    template_name = 'articles/detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['related'] = self.get_related_articles()
        return context
```

❌ **Wrong: Overly complex function view**
```python
def article_detail(request, pk):  # Too complex for function
    article = get_object_or_404(Article, pk=pk)
    comments = article.comments.filter(active=True)

    if request.method == 'POST':
        # Complex form handling mixed with display logic
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.article = article
            comment.save()
            return redirect('article_detail', pk=pk)
    else:
        form = CommentForm()

    return render(request, 'article/detail.html', {
        'article': article,
        'comments': comments,
        'form': form
    })
```

**Common mistakes:**
- Using class-based views for simple 2-line functions
- Writing complex function views with multiple responsibilities
- Not using Django's generic views when appropriate
- Mixing view logic with business logic

**When to apply:**
- Creating new views
- Refactoring existing views
- Reviewing view architecture
- During Django application design