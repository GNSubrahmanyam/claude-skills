# Views HTTP Methods (HIGH)

**Impact:** HIGH - Ensures proper RESTful API design and security

**Problem:**
Not properly handling different HTTP methods can lead to security vulnerabilities, poor API design, and unexpected behavior. Functions that should only accept POST requests accepting GET requests, or vice versa.

**Solution:**
Explicitly handle appropriate HTTP methods and return proper HTTP status codes. Use Django's method decorators or check `request.method` explicitly.

**Examples:**

❌ **Wrong: Missing method validation**
```python
def create_post(request):
    # Accepts any HTTP method! Dangerous!
    if request.method == 'POST':
        # Handle POST
        pass
    # GET requests fall through without proper response

def delete_item(request, item_id):
    # No method checking - accepts GET, POST, etc.
    Item.objects.get(id=item_id).delete()
    return redirect('item_list')  # Wrong - should be POST only
```

✅ **Correct: Proper HTTP method handling**
```python
from django.http import HttpResponseNotAllowed, HttpResponseBadRequest
from django.views.decorators.http import require_http_methods

# Method 1: Decorator approach
@require_http_methods(["GET", "POST"])
def article_view(request, pk):
    article = get_object_or_404(Article, pk=pk, published=True)

    if request.method == 'GET':
        return render(request, 'article/detail.html', {'article': article})

    elif request.method == 'POST':
        # Handle form submission
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.article = article
            comment.author = request.user
            comment.save()
            return redirect('article_detail', pk=pk)
        else:
            return render(request, 'article/detail.html', {
                'article': article,
                'form': form
            })

# Method 2: Class-based view method dispatch
class ArticleView(View):
    def get(self, request, pk):
        article = get_object_or_404(Article, pk=pk, published=True)
        return render(request, 'article/detail.html', {'article': article})

    def post(self, request, pk):
        # Handle POST logic
        pass

    def put(self, request, pk):
        # Handle PUT logic
        pass

    def delete(self, request, pk):
        # Handle DELETE logic
        pass

# Method 3: Explicit method checking with proper responses
def api_endpoint(request):
    if request.method == 'GET':
        data = {'items': Item.objects.values('id', 'name')}
        return JsonResponse(data)

    elif request.method == 'POST':
        try:
            item = Item.objects.create(
                name=request.POST.get('name'),
                # ... other fields
            )
            return JsonResponse({'id': item.id}, status=201)
        except ValidationError as e:
            return JsonResponse({'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        # Handle bulk delete
        Item.objects.all().delete()
        return HttpResponse(status=204)

    else:
        # Method not allowed
        return HttpResponseNotAllowed(['GET', 'POST', 'DELETE'])

# Method 4: Using Django REST framework (if available)
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET', 'POST'])
def item_list(request):
    if request.method == 'GET':
        items = Item.objects.all()
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**Common mistakes:**
- Not checking HTTP methods at all
- Using wrong decorators (`require_POST` vs `require_http_methods`)
- Returning wrong status codes for different scenarios
- Not handling unsupported methods properly
- Mixing GET and POST logic in the same view without clear separation

**When to apply:**
- Implementing form handling views
- Creating API endpoints
- Building CRUD operations
- During API design and implementation
- When reviewing view security