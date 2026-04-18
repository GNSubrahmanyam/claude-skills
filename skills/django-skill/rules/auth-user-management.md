# Authentication User Management (HIGH)

**Impact:** HIGH - Ensures secure user authentication and authorization

**Problem:**
Improper authentication setup can lead to security vulnerabilities, poor user experience, and data breaches.

**Solution:**
Use Django's built-in authentication system properly. Implement proper login/logout flows, password management, and user permissions.

**Examples:**

❌ **Wrong: Manual authentication**
```python
# DON'T implement your own authentication!
def login_view(request):
    username = request.POST.get('username')
    password = request.POST.get('password')

    # Vulnerable to timing attacks and other issues
    try:
        user = User.objects.get(username=username)
        if user.check_password(password):
            # Manual session management - error prone
            request.session['user_id'] = user.id
            return redirect('home')
    except User.DoesNotExist:
        pass

    return render(request, 'login.html', {'error': 'Invalid credentials'})
```

✅ **Correct: Django authentication**
```python
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = authenticate(
                username=form.cleaned_data['username'],
                password=form.cleaned_data['password']
            )
            if user is not None:
                login(request, user)
                messages.success(request, f'Welcome back, {user.username}!')
                return redirect(request.GET.get('next', 'home'))
            else:
                messages.error(request, 'Invalid username or password.')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = AuthenticationForm()

    return render(request, 'login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('home')

@login_required
def profile_view(request):
    """Protected view requiring authentication"""
    return render(request, 'profile.html', {
        'user': request.user
    })

@login_required
def change_password(request):
    """Secure password change"""
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # Keep user logged in
            messages.success(request, 'Password changed successfully!')
            return redirect('profile')
    else:
        form = PasswordChangeForm(request.user)

    return render(request, 'change_password.html', {'form': form})

# Custom user model (when needed)
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

# Permissions and groups
class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    published = models.BooleanField(default=False)

    class Meta:
        permissions = [
            ("can_publish", "Can publish articles"),
            ("can_edit_others", "Can edit others' articles"),
        ]

    def can_edit(self, user):
        """Business logic for edit permissions"""
        return (
            user == self.author or
            user.has_perm('articles.can_edit_others') or
            user.is_staff
        )

# View with permission checking
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.core.exceptions import PermissionDenied

class ArticleCreateView(LoginRequiredMixin, CreateView):
    model = Article
    fields = ['title', 'content']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

class ArticleUpdateView(LoginRequiredMixin, UpdateView):
    model = Article

    def get_queryset(self):
        """Users can only edit their own articles or if they have permission"""
        if self.request.user.has_perm('articles.can_edit_others'):
            return Article.objects.all()
        return Article.objects.filter(author=self.request.user)

    def dispatch(self, request, *args, **kwargs):
        """Additional permission checking"""
        article = self.get_object()
        if not article.can_edit(request.user):
            raise PermissionDenied("You don't have permission to edit this article")
        return super().dispatch(request, *args, **kwargs)
```

**Common mistakes:**
- Implementing custom authentication instead of using Django's
- Not using `@login_required` decorator
- Storing passwords in plain text
- Not updating session after password change
- Missing permission checks on sensitive operations
- Not handling authentication errors properly

**When to apply:**
- Implementing user login/logout functionality
- Protecting sensitive views and operations
- Managing user permissions and roles
- Building user profile systems
- During security implementation and testing