# Advanced Internationalization (LOW)

**Impact:** LOW - Enables complex multilingual applications and locale-specific features

**Problem:**
Basic internationalization may not cover complex scenarios like pluralization, context-dependent translations, or locale-specific formatting.

**Solution:**
Implement advanced i18n patterns including custom translation functions, locale-aware formatting, and translation context management.

**Examples:**

❌ **Wrong: Basic i18n without advanced features**
```python
# Only basic translations, no advanced features
{% load i18n %}

<h1>{% trans "Welcome" %}</h1>
<p>{% trans "You have" %} {{ count }} {% trans "messages" %}</p>

# No pluralization, context, or advanced formatting
```

✅ **Correct: Advanced internationalization**
```python
# templates/advanced_i18n.html
{% load i18n %}

<!-- Pluralization with context -->
{% blocktrans count messages_count=unread_messages|length context "message count" %}
    There is {{ messages_count }} unread message.
{% plural %}
    There are {{ messages_count }} unread messages.
{% endblocktrans %}

<!-- Context for disambiguation -->
<p>{% trans "May" context "month name" %} 15, {% trans "May" context "verb" %} we meet?</p>

<!-- Advanced pluralization -->
{% blocktrans with item_count=items|length context "shopping cart" %}
    Your cart contains {{ item_count }} item.
{% plural %}
    Your cart contains {{ item_count }} items.
{% endblocktrans %}

<!-- Locale-aware formatting -->
{% load l10n %}
<p>{% trans "Price" %}: {{ price|localize }}</p>
<p>{% trans "Date" %}: {{ date|localize }}</p>
<p>{% trans "Number" %}: {{ number|localize }}</p>
```

**Custom Translation Functions:**
```python
# utils.py - Custom translation utilities
from django.utils.translation import gettext as _, ngettext, pgettext, npgettext
from django.utils import translation

def get_user_greeting(user):
    """Get appropriate greeting based on time and user preferences"""
    hour = timezone.now().hour

    if hour < 12:
        greeting = _("Good morning")
    elif hour < 18:
        greeting = _("Good afternoon")
    else:
        greeting = _("Good evening")

    # Use user's preferred language if available
    if hasattr(user, 'preferred_language'):
        with translation.override(user.preferred_language):
            greeting = _(greeting)

    return f"{greeting}, {user.get_full_name()}!"

def format_item_count(count, item_type):
    """Format item count with proper pluralization"""
    if item_type == 'book':
        return npgettext(
            "book count",
            "1 book",
            "%(count)s books",
            count
        ) % {'count': count}
    elif item_type == 'article':
        return npgettext(
            "article count",
            "1 article",
            "%(count)s articles",
            count
        ) % {'count': count}

def translate_with_fallback(text, fallback=None):
    """Translate text with fallback"""
    try:
        return _(text)
    except:
        return fallback or text

# Context-aware translations
def get_month_name(month_number):
    """Get localized month name with context"""
    months = [
        pgettext("month name", "January"),
        pgettext("month name", "February"),
        pgettext("month name", "March"),
        pgettext("month name", "April"),
        pgettext("month name", "May"),
        pgettext("month name", "June"),
        pgettext("month name", "July"),
        pgettext("month name", "August"),
        pgettext("month name", "September"),
        pgettext("month name", "October"),
        pgettext("month name", "November"),
        pgettext("month name", "December"),
    ]
    return months[month_number - 1]

def get_verb_conjugation(verb, tense, person):
    """Handle verb conjugations in different languages"""
    # This would be complex and language-specific
    # Simplified example
    if translation.get_language() == 'es':
        conjugations = {
            'present': {'yo': 'hablo', 'tú': 'hablas', 'él': 'habla'},
            'past': {'yo': 'hablé', 'tú': 'hablaste', 'él': 'habló'}
        }
        return conjugations.get(tense, {}).get(person, verb)
    else:
        return verb  # English default
```

**Advanced Translation Management:**
```python
# translation_utils.py
from django.utils.translation import activate, get_language, to_locale
from django.utils import translation
import os

class TranslationManager:
    """Advanced translation management"""

    def __init__(self):
        self.supported_languages = ['en', 'es', 'fr', 'de']
        self.fallback_language = 'en'

    def translate_with_context(self, text, context=None, language=None):
        """Translate text with context"""
        current_lang = get_language()

        try:
            if language and language != current_lang:
                with translation.override(language):
                    if context:
                        return pgettext(context, text)
                    return _(text)
            else:
                if context:
                    return pgettext(context, text)
                return _(text)
        except:
            return text

    def get_available_languages(self):
        """Get available languages with metadata"""
        return [
            {
                'code': lang,
                'name': self.get_language_name(lang),
                'locale': to_locale(lang),
                'flag': self.get_language_flag(lang),
            }
            for lang in self.supported_languages
        ]

    def get_language_name(self, lang_code):
        """Get native language name"""
        names = {
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
        }
        return names.get(lang_code, lang_code)

    def get_language_flag(self, lang_code):
        """Get flag emoji for language"""
        flags = {
            'en': '🇺🇸',
            'es': '🇪🇸',
            'fr': '🇫🇷',
            'de': '🇩🇪',
        }
        return flags.get(lang_code, '🏳️')

    def detect_user_language(self, request):
        """Detect user's preferred language"""
        # Check user preference
        if request.user.is_authenticated and hasattr(request.user, 'preferred_language'):
            return request.user.preferred_language

        # Check session
        session_lang = request.session.get('django_language')
        if session_lang:
            return session_lang

        # Check browser accept-language
        accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        for lang in self.supported_languages:
            if lang in accept_lang:
                return lang

        return self.fallback_language

# Global translation manager
translation_manager = TranslationManager()
```

**Locale-Aware Operations:**
```python
# locale_utils.py
from django.utils import translation, formats
from django.utils.translation import gettext as _
import locale
import datetime

class LocaleManager:
    """Handle locale-aware operations"""

    def format_currency(self, amount, currency='USD'):
        """Format currency according to locale"""
        lang = translation.get_language()

        if lang == 'en':
            return f"${amount:,.2f}"
        elif lang == 'es':
            return f"{amount:,.2f} €".replace(',', ' ').replace('.', ',')
        elif lang == 'de':
            return f"{amount:,.2f} €".replace(',', ' ').replace('.', ',')
        else:
            return formats.localize(amount)

    def format_date_long(self, date):
        """Format date in long format for locale"""
        lang = translation.get_language()

        if lang == 'en':
            return date.strftime("%B %d, %Y")
        elif lang == 'es':
            months = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
            ]
            return f"{date.day} de {months[date.month - 1]} de {date.year}"
        elif lang == 'fr':
            return date.strftime("%d %B %Y")
        else:
            return formats.date_format(date, 'DATE_FORMAT')

    def format_number(self, number):
        """Format number according to locale"""
        return formats.localize(number)

    def get_locale_info(self):
        """Get current locale information"""
        current_lang = translation.get_language()
        locale_info = {
            'language': current_lang,
            'locale': translation.to_locale(current_lang),
            'direction': 'rtl' if current_lang in ['ar', 'he'] else 'ltr',
            'date_format': formats.get_format('DATE_FORMAT'),
            'time_format': formats.get_format('TIME_FORMAT'),
            'currency_symbol': self._get_currency_symbol(current_lang),
        }
        return locale_info

    def _get_currency_symbol(self, lang):
        """Get currency symbol for language"""
        symbols = {
            'en': '$',
            'es': '€',
            'fr': '€',
            'de': '€',
        }
        return symbols.get(lang, '$')

# Template context processor
def locale_context(request):
    """Add locale information to template context"""
    manager = LocaleManager()
    return {
        'locale_info': manager.get_locale_info(),
        'locale_manager': manager,
    }

# Usage in templates
{% load locale_utils %}
{{ 1234.56|localize }}
{{ today|date:"SHORT_DATE_FORMAT" }}
{{ price|currency }}
```

**Translation Testing:**
```python
# tests/test_i18n.py
from django.test import TestCase, override_settings
from django.utils import translation
from django.utils.translation import gettext as _

class InternationalizationTest(TestCase):
    """Test internationalization features"""

    def test_basic_translation(self):
        """Test basic translation functionality"""
        with translation.override('es'):
            text = _("Hello")
            self.assertEqual(text, "Hola")

    def test_pluralization(self):
        """Test pluralization"""
        with translation.override('es'):
            singular = ngettext(
                "%(count)s item",
                "%(count)s items",
                1
            ) % {'count': 1}
            plural = ngettext(
                "%(count)s item",
                "%(count)s items",
                2
            ) % {'count': 2}

            self.assertEqual(singular, "1 elemento")
            self.assertEqual(plural, "2 elementos")

    def test_context_translation(self):
        """Test context-aware translations"""
        with translation.override('es'):
            month = pgettext("month name", "May")
            verb = pgettext("verb", "May")

            # Different translations for same word
            self.assertEqual(month, "Mayo")  # month
            self.assertEqual(verb, "Puedo")  # can/may

    def test_locale_formatting(self):
        """Test locale-aware formatting"""
        manager = LocaleManager()

        with translation.override('es'):
            currency = manager.format_currency(1234.56)
            self.assertIn('€', currency)  # Should use euro

        with translation.override('en'):
            currency = manager.format_currency(1234.56)
            self.assertIn('$', currency)  # Should use dollar

    def test_translation_manager(self):
        """Test custom translation manager"""
        manager = TranslationManager()

        # Test context translation
        text = manager.translate_with_context("May", "month name", "es")
        self.assertEqual(text, "Mayo")

        # Test language detection
        # (Would need mock request object)
```

**Common mistakes:**
- Not providing context for ambiguous translations
- Missing pluralization for count-dependent text
- Hardcoding locale-specific formats
- Not testing translations in different languages
- Using machine translation instead of professional translation
- Not considering text expansion in different languages

**When to apply:**
- Building multi-language applications
- Supporting right-to-left languages
- Implementing locale-specific formatting
- Creating translation-aware business logic
- Managing complex pluralization scenarios
- Ensuring professional translation quality