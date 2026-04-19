---
title: Forms ModelForm Usage
impact: HIGH
impactDescription: Ensures DRY principle and reduces boilerplate code
tags: django, forms, modelform
---

## Forms ModelForm Usage

**Problem:**
Writing forms manually for model-backed data leads to code duplication, maintenance overhead, and potential inconsistencies between forms and models.

**Solution:**
Prefer ModelForm for forms that create or edit model instances. It automatically generates fields, handles validation, and saves data correctly.

**Examples:**

✅ **Correct: ModelForm for model data**
```python
# forms.py
from django import forms
from .models import Article

class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'content', 'author', 'published_date']
        widgets = {
            'published_date': forms.DateInput(attrs={'type': 'date'}),
        }

# views.py
def create_article(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            form.save()  # Automatically creates Article instance
            return redirect('article_list')
    else:
        form = ArticleForm()
    return render(request, 'article/form.html', {'form': form})
```

❌ **Wrong: Manual form for model data**
```python
# Avoid this duplication
class ArticleForm(forms.Form):
    title = forms.CharField(max_length=100)
    content = forms.CharField(widget=forms.Textarea)
    author = forms.ModelChoiceField(queryset=Author.objects.all())
    published_date = forms.DateField()

    def save(self):  # Manual save logic - error prone
        return Article.objects.create(**self.cleaned_data)
```

**Common mistakes:**
- Writing manual forms when ModelForm would work
- Excluding important fields from ModelForm
- Not customizing ModelForm when needed
- Using regular forms for simple model operations

**When to apply:**
- Creating forms that work with model data
- Implementing CRUD operations
- During form design and planning
- Refactoring existing forms