// Home Page JavaScript
    // DOM Elements
    const textarea = document.getElementById('aiText');
    const humanizedTextarea = document.getElementById('humanizedText');
    const wordCountSpan = document.getElementById('wordCount');
    const outputWordCountSpan = document.getElementById('outputWordCount');
    const captchaSpan = document.getElementById('captcha');
    const captchaInput = document.getElementById('captchaInput');
    const convertBtn = document.getElementById('convertBtn');
    const loader = document.getElementById('loader');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const pasteInputBtn = document.getElementById('pasteInputBtn');
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    // Usage limit configuration
    const DAILY_LIMIT = 2; // Maximum 2 uses per day
    const MAX_TEXT_LENGTH = 300; // Maximum 300 characters per use
    
    // Add usage counter display to the UI
    function addUsageCounter() {
      const converterContainer = document.querySelector('.converter-container');
      const usageCounter = document.createElement('div');
      usageCounter.id = 'usageCounter';
      usageCounter.style.cssText = `
        text-align: center;
        color: #666;
        margin-bottom: 15px;
        font-size: 14px;
      `;
      converterContainer.insertBefore(usageCounter, converterContainer.firstChild);
      updateUsageCounter();
    }
    
    // Get current date in YYYY-MM-DD format
    function getCurrentDate() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    
    // Check if user has reached daily limit
    function checkUsageLimit() {
      const today = getCurrentDate();
      const usageData = JSON.parse(localStorage.getItem('kopaper_usage')) || {};
      
      if (usageData.date !== today) {
        // Reset usage for new day
        usageData.date = today;
        usageData.count = 0;
        localStorage.setItem('kopaper_usage', JSON.stringify(usageData));
        return false;
      }
      
      return usageData.count >= DAILY_LIMIT;
    }
    
    // Increment usage counter
    function incrementUsage() {
      const usageData = JSON.parse(localStorage.getItem('kopaper_usage')) || {};
      usageData.count = (usageData.count || 0) + 1;
      localStorage.setItem('kopaper_usage', JSON.stringify(usageData));
      updateUsageCounter();
    }
    
    // Update usage counter display
    function updateUsageCounter() {
      const today = getCurrentDate();
      const usageData = JSON.parse(localStorage.getItem('kopaper_usage')) || { date: today, count: 0 };
      const remaining = Math.max(0, DAILY_LIMIT - usageData.count);
      
      const usageCounter = document.getElementById('usageCounter');
      if (usageCounter) {
        usageCounter.textContent = `Daily Usage: ${usageData.count}/${DAILY_LIMIT} | Remaining: ${remaining}`;
      }
    }
    
    // FAQ Elements
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    let currentCaptcha = '';

    // Generate random 4-digit captcha
    function generateCaptcha() {
      currentCaptcha = Math.floor(1000 + Math.random() * 9000).toString();
      captchaSpan.textContent = currentCaptcha;
    }

    // Initialize captcha on page load
    generateCaptcha();

    // Count input characters
    textarea.addEventListener('input', () => {
      const charCount = textarea.value.length;
      wordCountSpan.textContent = `${charCount} / ${MAX_TEXT_LENGTH}`;
      
      // Apply visual feedback and disable button when limit exceeded
      if (charCount > MAX_TEXT_LENGTH) {
        wordCountSpan.style.color = '#ef4444'; // Red color for over limit
        convertBtn.disabled = true;
        convertBtn.style.opacity = '0.5';
        convertBtn.style.cursor = 'not-allowed';
      } else {
        wordCountSpan.style.color = ''; // Reset to default color
        convertBtn.disabled = false;
        convertBtn.style.opacity = '';
        convertBtn.style.cursor = '';
      }
      
      // Clear output if input is empty
      if (charCount === 0) {
        humanizedTextarea.value = '';
        outputWordCountSpan.textContent = '0';
        copyOutputBtn.disabled = true;
      }
    });

    // Update output character count
    function updateOutputWordCount() {
      const charCount = humanizedTextarea.value.length;
      outputWordCountSpan.textContent = charCount;
      copyOutputBtn.disabled = charCount === 0;
    }

    // Show toast notification
    function showToast(message, type = 'success') {
      toastMessage.textContent = message;
      toast.className = `toast ${type}`;
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // Clear input textarea
    clearInputBtn.addEventListener('click', () => {
      textarea.value = '';
      wordCountSpan.textContent = '0';
      humanizedTextarea.value = '';
      outputWordCountSpan.textContent = '0';
      copyOutputBtn.disabled = true;
    });

    // Paste from clipboard
    pasteInputBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        textarea.value = text;
        wordCountSpan.textContent = text.length;
        showToast('Text pasted successfully');
      } catch (err) {
        showToast('Failed to paste text', 'error');
        console.error('Failed to read clipboard:', err);
      }
    });

    // Copy output text to clipboard
    copyOutputBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(humanizedTextarea.value);
        showToast('Humanized text copied to clipboard');
      } catch (err) {
        showToast('Failed to copy text', 'error');
        console.error('Failed to write clipboard:', err);
      }
    });

    // Refresh captcha
    refreshCaptchaBtn.addEventListener('click', () => {
      generateCaptcha();
      captchaInput.value = '';
    });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      const icon = mobileMenuBtn.querySelector('i');
      if (mainNav.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });

    // FAQ toggle functionality
    faqQuestions.forEach(question => {
      question.addEventListener('click', () => {
        const targetId = question.getAttribute('data-target');
        const answer = document.getElementById(targetId);
        const icon = document.getElementById(`faqIcon${targetId.replace('faq', '')}`);
        
        answer.classList.toggle('active');
        icon.classList.toggle('active');
      });
    });

    // Simulate AI text humanization process
    // In a production environment, this would call a backend API
    function humanizeText(aiText) {
      // Simple simulation - replace with actual AI processing in production
      const replacements = [
        { from: 'AI', to: 'artificial intelligence' },
        { from: 'generated', to: 'created' },
        { from: 'text', to: 'content' },
        { from: 'will', to: 'will likely' },
        { from: 'can', to: 'is able to' },
        { from: 'make', to: 'create' },
        { from: 'use', to: 'utilize' },
        { from: 'help', to: 'assist' },
        { from: 'very', to: 'extremely' },
        { from: 'good', to: 'excellent' },
        { from: 'important', to: 'crucial' },
        { from: 'many', to: 'numerous' },
        { from: 'often', to: 'frequently' },
        { from: 'show', to: 'demonstrate' },
        { from: 'get', to: 'obtain' }
      ];
      
      let humanized = aiText;
      
      // Replace certain words to make text more natural
      replacements.forEach(replacement => {
        const regex = new RegExp(`\\b${replacement.from}\\b`, 'gi');
        humanized = humanized.replace(regex, replacement.to);
      });
      
      // Add natural transitions and sentence variation
      const transitions = ['In fact', 'Interestingly', 'As a matter of fact', 'Furthermore', 'Additionally', 'On the other hand'];
      const sentences = humanized.split(/(?<=[.!?])\s+/);
      
      // Randomly add transition words to some sentences
      const humanizedSentences = sentences.map((sentence, index) => {
        if (index > 0 && Math.random() > 0.7 && sentence.length > 20) {
          const transition = transitions[Math.floor(Math.random() * transitions.length)];
          return `${transition}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
        return sentence;
      });
      
      return humanizedSentences.join(' ');
    }

    // Call Cloudflare Workers API proxy for text humanization
    async function callGeminiAPI(text) {
      try {
        // Call our Cloudflare Workers proxy API
        const response = await fetch('https://humanize-api.1628582080.workers.dev/humanizeai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text
          })
        });
        
        if (!response.ok) {
          // Handle API errors
          const errorData = await response.json().catch(() => ({
            error: `API request failed: ${response.statusText}`
          }));
          
          // If usage limit is exceeded, show a friendly error message
          if (response.status === 429) {
            showToast(errorData.error || 'Daily usage limit reached, please try again tomorrow!', 'error');
          } else if (response.status === 413) {
            showToast(errorData.error || 'Text too long, please shorten and try again!', 'error');
          } else {
            showToast(errorData.error || 'Processing failed, please try again later!', 'error');
          }
          
          throw new Error(errorData.error);
        }
        
        const data = await response.json();
        
        // Update frontend usage display
        if (data.usage) {
          // Update localStorage to keep frontend and backend consistent
          const today = getCurrentDate();
          localStorage.setItem('kopaper_usage', JSON.stringify({
            date: today,
            count: data.usage.limit - data.usage.remaining
          }));
          
          // Update UI display
          updateUsageCounter();
        }
        
        // Parse Gemini API response (forwarded through proxy)
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts) {
          return data.candidates[0].content.parts[0].text;
        }
        
        throw new Error('API response format is incorrect');
      } catch (error) {
        console.error('API call error:', error);
        // If API call fails, fall back to local simulation conversion
        return humanizeText(text);
      }
    }

    // Handle conversion process when button is clicked
    convertBtn.addEventListener('click', async () => {
      // Validate input
      if (!textarea.value.trim()) {
        showToast('Please paste your AI-generated text first', 'error');
        textarea.focus();
        return;
      }
      
      // Check usage limit
      if (checkUsageLimit()) {
        showToast('You have reached your daily usage limit (2 times). Please try again tomorrow.', 'error');
        return;
      }
      
      // Validate captcha
      if (captchaInput.value.trim() !== currentCaptcha) {
        showToast('Captcha incorrect, please try again.', 'error');
        generateCaptcha();
        captchaInput.value = '';
        captchaInput.focus();
        return;
      }

      // Set loading state
      textarea.disabled = true;
      convertBtn.disabled = true;
      convertBtn.querySelector('i').style.display = 'none';
      convertBtn.querySelector('span').style.display = 'none';
      loader.style.display = 'inline-block';
      humanizedTextarea.value = 'Humanizing your text...';
      updateOutputWordCount();

      try {
        // Call Gemini API for actual text humanization
        const humanized = await callGeminiAPI(textarea.value);
        
        humanizedTextarea.value = humanized;
        updateOutputWordCount();
        
        // Increment usage counter
        incrementUsage();
        
        // Show success message
        showToast('Text humanized successfully!');
      } catch (error) {
        console.error('Conversion error:', error);
        humanizedTextarea.value = 'An error occurred during text humanization. Please try again.';
        updateOutputWordCount();
        showToast('An error occurred. Please try again later.', 'error');
      } finally {
        // Reset state
        textarea.disabled = false;
        convertBtn.disabled = false;
        convertBtn.querySelector('i').style.display = 'inline-block';
        convertBtn.querySelector('span').style.display = 'inline-block';
        loader.style.display = 'none';
        
        // Generate new captcha for next use
        generateCaptcha();
        captchaInput.value = '';
      }
    });

    // Initialize FAQ - open first item by default
    document.getElementById('faq1').classList.add('active');
    document.getElementById('faqIcon1').classList.add('active');
    
    // Add event listener for smooth scrolling on anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth'
          });
          
          // Close mobile menu if open
          if (mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
          }
        }
      });
    });
    
    // Initialize usage counter on page load
    document.addEventListener('DOMContentLoaded', () => {
      addUsageCounter();
    });