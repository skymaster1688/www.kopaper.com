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
      wordCountSpan.textContent = charCount;
      
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

    // Handle conversion process when button is clicked
    convertBtn.addEventListener('click', () => {
      // Validate input
      if (!textarea.value.trim()) {
        showToast('Please paste your AI-generated text first', 'error');
        textarea.focus();
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

      // Simulate API call with timeout
      setTimeout(() => {
        // In production, replace this with actual API call
        // const humanized = humanizeText(textarea.value);
        const humanized = 'Humanizing your text...';
        
        humanizedTextarea.value = humanized;
        updateOutputWordCount();
        
        // Reset state
        textarea.disabled = false;
        convertBtn.disabled = false;
        convertBtn.querySelector('i').style.display = 'inline-block';
        convertBtn.querySelector('span').style.display = 'inline-block';
        loader.style.display = 'none';
        
        // Generate new captcha for next use
        generateCaptcha();
        captchaInput.value = '';
        
        // Show success message
        showToast('Text humanized successfully!');
      }, 2000);
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