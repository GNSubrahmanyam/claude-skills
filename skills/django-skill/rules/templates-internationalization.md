# Templates Internationalization (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Enables global user experience and accessibility

**Problem:**
Hardcoded text in templates prevents internationalization and limits the application's global reach. Users in different languages cannot understand the interface.

**Solution:**
Use Django's internationalization framework with proper translation tags, locale files, and language switching.

**Examples:**

❌ **Wrong: Hardcoded text**
```django
<!-- Bad: English-only -->
<h1>Welcome to our site!</h1>
<p>Please log in to continue.</p>
<button>Submit</button>
<a href="/logout/">Logout</a>

{% if user.is_authenticated %}
  <p>Hello, {{ user.username }}!</p>
{% else %}
  <p>Please register or login.</p>
{% endif %}
```

✅ **Correct: Internationalized templates**
```django
<!-- templates/base.html -->
{% load i18n %}

<h1>{% trans "Welcome to our site!" %}</h1>
<p>{% trans "Please log in to continue." %}</p>
<button>{% trans "Submit" %}</button>
<a href="{% url 'logout' %}">{% trans "Logout" %}</a>

{% if user.is_authenticated %}
  <p>{% blocktrans with username=user.get_full_name %}{{ username }}, welcome back!{% endblocktrans %}</p>
{% else %}
  <p>{% trans "Please register or login." %}</p>
{% endif %}

<!-- Pluralization -->
<p>{% blocktrans count articles.count as article_count %}
    There is {{ article_count }} article.
{% plural %}
    There are {{ article_count }} articles.
{% endblocktrans %}</p>

<!-- Context for translators -->
<p>{% trans "Search" context "Verb: to search for something" %}</p>
<p>{% trans "Search" context "Noun: the search box" %}</p>
```

**Internationalization settings:**
```python
# settings.py
USE_I18N = True
USE_L10N = True
USE_TZ = True

LANGUAGE_CODE = 'en-us'

LANGUAGES = [
    ('en', 'English'),
    ('es', 'Español'),
    ('fr', 'Français'),
    ('de', 'Deutsch'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# Middleware for language detection
MIDDLEWARE = [
    'django.middleware.locale.LocaleMiddleware',
    # ... other middleware
]
```

**Language switching:**
```django
<!-- templates/language_selector.html -->
{% load i18n %}

<form action="{% url 'set_language' %}" method="post">
    {% csrf_token %}
    <input name="next" type="hidden" value="{{ redirect_to }}">
    <select name="language">
        {% get_current_language as LANGUAGE_CODE %}
        {% get_available_languages as LANGUAGES %}
        {% get_language_info_list for LANGUAGES as languages %}
        {% for language in languages %}
            <option value="{{ language.code }}"{% if language.code == LANGUAGE_CODE %} selected{% endif %}>
                {{ language.name_local }}
            </option>
        {% endfor %}
    </select>
    <input type="submit" value="{% trans 'Change Language' %}">
</form>
```

**Translation files:**
```bash
# Generate translation files
python manage.py makemessages -l es -l fr -l de

# Edit locale/es/LC_MESSAGES/django.po
#: templates/base.html:5
msgid "Welcome to our site!"
msgstr "¡Bienvenido a nuestro sitio!"

#: templates/base.html:6
msgid "Please log in to continue."
msgstr "Por favor inicia sesión para continuar."

# Compile translations
python manage.py compilemessages
```

**Common mistakes:**
- Not using `{% trans %}` tags for user-facing text
- Missing `{% load i18n %}` in templates
- Not providing context for ambiguous words
- Hardcoding dates and numbers without localization
- Not testing with different languages
- Missing pluralization handling

**When to apply:**
- Building multi-language applications
- Supporting international users
- Following accessibility guidelines
- Preparing for global deployment
- During internationalization implementation