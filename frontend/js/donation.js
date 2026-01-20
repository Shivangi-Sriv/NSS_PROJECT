import { auth, db } from './firebase.js';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const STRIPE_PUBLISHABLE_KEY = "pk_test_51SrKUpB5f4ZKaPRWTbzXrE0pMCyO53APp489EgINih4pOhhNxlYUNgNkK2XTfhd7Mvs1VmXuJ15JRIQtVNExbujf00EHv5RWxx";

const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
const API_URL = 'http://localhost:3000/api';

let cardElement;
let currentDonationId = null;
let currentClientSecret = null;

// Test backend connection
async function testBackend() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return true;
  } catch (error) {
    alert('Backend server is not running! Please start it with: node server.js');
    return false;
  }
}

// Initialize payment form
async function initializePayment() {
  const backendOk = await testBackend();
  if (!backendOk) return;

  const donateBtn = document.getElementById('donate-btn');
  const amountInput = document.getElementById('amount');
  const paymentForm = document.getElementById('payment-form');
  const submitBtn = document.getElementById('submit-payment');
  const errorDiv = document.getElementById('payment-errors');

  const elements = stripe.elements();
  
  cardElement = elements.create('card', {
    hidePostalCode: true,
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#e74c3c',
        iconColor: '#e74c3c'
      }
    }
  });

  cardElement.mount('#payment-element');

  cardElement.on('change', (event) => {
    if (event.error) {
      errorDiv.textContent = event.error.message;
    } else {
      errorDiv.textContent = '';
    }
  });

  // Handle "Proceed to Payment" button
  donateBtn.addEventListener('click', async () => {
    const amount = parseFloat(amountInput.value);

    if (!amount || amount < 50) {
      errorDiv.textContent = 'Please enter a donation amount of at least ₹50';
      return;
    }

    donateBtn.disabled = true;
    donateBtn.textContent = 'Processing...';
    errorDiv.textContent = '';

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please log in to donate');
        window.location.href = 'index.html';
        return;
      }

      // Save donation record in Firebase as "pending"
      const donationRef = await addDoc(collection(db, 'donations'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anonymous',
        amount: amount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      currentDonationId = donationRef.id;

      // Create payment intent on backend
      const response = await fetch(`${API_URL}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          userEmail: user.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();

      currentClientSecret = data.clientSecret;

      // Update donation record with payment intent ID
      await updateDoc(doc(db, 'donations', currentDonationId), {
        paymentIntentId: data.paymentIntentId
      });

      // Show payment form
      paymentForm.style.display = 'block';
      donateBtn.style.display = 'none';

    } catch (error) {
      errorDiv.textContent = error.message;
      donateBtn.disabled = false;
      donateBtn.textContent = 'Proceed to Payment';
      
      if (currentDonationId) {
        await updateDoc(doc(db, 'donations', currentDonationId), {
          status: 'failed',
          error: error.message
        });
      }
    }
  });

  // Handle payment submission
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentClientSecret) {
      errorDiv.textContent = 'Payment not initialized. Please try again.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Payment...';
    errorDiv.textContent = '';

    try {
      const user = auth.currentUser;
      
      const result = await stripe.confirmCardPayment(currentClientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user.displayName || 'Anonymous',
            email: user.email
          }
        }
      });

      if (result.error) {
        // Check if user cancelled the payment
        if (result.error.code === 'payment_intent_unexpected_state' || 
            result.error.type === 'card_error') {
          errorDiv.textContent = result.error.message;
          submitBtn.disabled = false;
          submitBtn.textContent = 'Pay Now';
        }

        if (currentDonationId) {
          await updateDoc(doc(db, 'donations', currentDonationId), {
            status: 'failed',
            error: result.error.message,
            updatedAt: serverTimestamp()
          });
        }
        
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        await updateDoc(doc(db, 'donations', currentDonationId), {
          status: 'success',
          completedAt: serverTimestamp()
        });

        window.location.href = `stripe-success.html?donation_id=${currentDonationId}&amount=${result.paymentIntent.amount / 100}`;
      }
      
    } catch (error) {
      errorDiv.textContent = 'An error occurred: ' + error.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay Now';
      
      if (currentDonationId) {
        await updateDoc(doc(db, 'donations', currentDonationId), {
          status: 'failed',
          error: error.message,
          updatedAt: serverTimestamp()
        });
      }
    }
  });
}

// Handle success page
async function handleSuccessPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const donationId = urlParams.get('donation_id');
  const amount = urlParams.get('amount');

  if (donationId && amount) {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
      successMessage.textContent = `Thank you! Your donation of ₹${amount} was successful.`;
      successMessage.style.color = '#27ae60';
      successMessage.style.fontSize = '18px';
      successMessage.style.textAlign = 'center';
      successMessage.style.marginTop = '20px';
    }
  }
}

// Handle cancel page
async function handleCancelPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const donationId = urlParams.get('donation_id');
  const amount = urlParams.get('amount');

  if (donationId) {
    // Mark donation as cancelled in Firebase
    try {
      await updateDoc(doc(db, 'donations', donationId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating donation status:', error);
    }
  }

  const cancelMessage = document.getElementById('cancel-message');
  if (cancelMessage && amount) {
    cancelMessage.textContent = `Your payment of ₹${amount} was cancelled. No charges have been made to your account.`;
  }
}

// Initialize on page load
if (window.location.pathname.includes('stripe-success.html')) {
  handleSuccessPage();
} else if (window.location.pathname.includes('stripe-cancel.html')) {
  handleCancelPage();
} else {
  document.addEventListener('DOMContentLoaded', initializePayment);
}
