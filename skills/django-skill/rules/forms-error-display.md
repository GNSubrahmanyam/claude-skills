# Forms Error Display (HIGH)

**Impact:** HIGH - Provides clear feedback to users and prevents repeated submissions

**Problem:**
Poor error messages confuse users, lead to repeated form submissions, and increase support requests. Users abandon forms when they don't understand what went wrong.

**Solution:**
Display clear, specific error messages and provide helpful guidance. Use Django's form error handling and customize messages for better user experience.

**Examples:**

❌ **Wrong: Poor error display**
```django
<!-- templates/form.html -->
<form method="post">
    {% csrf_token %}
    <input type="text" name="username" required>
    <input type="email" name="email" required>
    <button type="submit">Submit</button>
</form>

{# No error display - users don't know what went wrong! #}
```

✅ **Correct: User-friendly error display**
```django
<!-- templates/contact/form.html -->
<form method="post" novalidate>  {# Disable browser validation #}
    {% csrf_token %}

    <div class="form-group {% if form.name.errors %}has-error{% endif %}">
        <label for="{{ form.name.id_for_label }}">Full Name:</label>
        {{ form.name }}
        {% if form.name.errors %}
            <div class="error-messages">
                {% for error in form.name.errors %}
                    <div class="error-message">
                        <i class="icon-error"></i> {{ error }}
                    </div>
                {% endfor %}
            </div>
        {% endif %}
        {% if form.name.help_text and not form.name.errors %}
            <div class="help-text">{{ form.name.help_text }}</div>
        {% endif %}
    </div>

    <div class="form-group {% if form.email.errors %}has-error{% endif %}">
        <label for="{{ form.email.id_for_label }}">Email Address:</label>
        {{ form.email }}
        {% if form.email.errors %}
            <div class="error-messages">
                {% for error in form.email.errors %}
                    <div class="error-message">
                        <i class="icon-error"></i> {{ error }}
                    </div>
                {% endfor %}
            </div>
        {% endif %}
        <div class="help-text">We'll never share your email with anyone else.</div>
    </div>

    <div class="form-group {% if form.message.errors %}has-error{% endif %}">
        <label for="{{ form.message.id_for_label }}">Message:</label>
        {{ form.message }}
        {% if form.message.errors %}
            <div class="error-messages">
                {% for error in form.message.errors %}
                    <div class="error-message">
                        <i class="icon-error"></i> {{ error }}
                    </div>
                {% endfor %}
            </div>
        {% endif %}
        <div class="help-text">Please provide as much detail as possible.</div>
    </div>

    {% if form.non_field_errors %}
        <div class="alert alert-error">
            <i class="icon-warning"></i>
            <strong>Please correct the following issues:</strong>
            <ul>
                {% for error in form.non_field_errors %}
                    <li>{{ error }}</li>
                {% endfor %}
            </ul>
        </div>
    {% endif %}

    <div class="form-actions">
        <button type="submit" class="btn btn-primary">
            <i class="icon-send"></i> Send Message
        </button>
        <a href="{% url 'home' %}" class="btn btn-secondary">Cancel</a>
    </div>
</form>

{# Form styling #}
<style>
.form-group {
    margin-bottom: 1.5rem;
}

.form-group.has-error input,
.form-group.has-error textarea,
.form-group.has-error select {
    border-color: #dc3545;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.error-messages {
    margin-top: 0.5rem;
}

.error-message {
    color: #dc3545;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.help-text {
    color: #6c757d;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.alert-error {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
}
</style>
```

```python
# forms.py - Customizing error messages
class ContactForm(forms.Form):
    name = forms.CharField(
        max_length=100,
        error_messages={
            'required': 'Please enter your full name.',
            'max_length': 'Your name is too long (maximum 100 characters).',
        }
    )

    email = forms.EmailField(
        error_messages={
            'required': 'Please enter your email address.',
            'invalid': 'Please enter a valid email address.',
        }
    )

    message = forms.CharField(
        widget=forms.Textarea,
        min_length=10,
        error_messages={
            'required': 'Please enter a message.',
            'min_length': 'Your message is too short (minimum 10 characters).',
        }
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Customize field error messages at runtime
        for field_name, field in self.fields.items():
            if hasattr(field, 'error_messages'):
                # Add field-specific help text
                if field_name == 'email':
                    field.help_text = "We'll use this to send you updates about your inquiry."
                elif field_name == 'message':
                    field.help_text = "Please be as detailed as possible so we can help you better."

    def add_error(self, field, error):
        """Override to provide custom error formatting"""
        if field == '__all__':
            # Non-field errors
            super().add_error(field, error)
        else:
            # Field-specific errors
            if isinstance(error, str):
                # Wrap error in a more user-friendly format
                error = f"{error}"
            super().add_error(field, error)

# View with error handling
def contact_view(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            # Process the form
            send_contact_email(form.cleaned_data)
            messages.success(request, 'Thank you! Your message has been sent.')
            return redirect('contact_success')
        else:
            # Log form errors for debugging
            logger.warning(f"Form validation failed: {form.errors}")

            # Add a general error message if no field errors
            if not form.errors and not form.non_field_errors():
                messages.error(request, 'There was an error processing your request. Please try again.')
    else:
        form = ContactForm()

    return render(request, 'contact/form.html', {
        'form': form,
        'page_title': 'Contact Us'
    })
```

**Common mistakes:**
- Not displaying form errors at all
- Showing raw Django error messages to users
- Not providing helpful guidance or help text
- Poor visual styling of error states
- Not handling non-field errors properly
- Generic error messages that don't help users fix issues

**When to apply:**
- Designing form templates
- Implementing form validation feedback
- Improving user experience
- During form testing and usability reviews
- When fixing form-related user complaints