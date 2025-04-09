'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import emailjs from '@emailjs/browser';

export default function EmailForm() {
  const [name, setName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Initialize EmailJS with environment variables
    try {
      emailjs.init({
        publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      });
      console.log('EmailJS initialized successfully');
    } catch (initError) {
      console.error('EmailJS initialization error:', initError);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Comprehensive validation
    if (!name || !recipientEmail || !grade) {
      setError('Please fill in all fields');
      return;
    }

    // Robust email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setError('Please enter a valid recipient email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Prepare detailed template parameters
      const templateParams = {
        name: name,
        to_email: recipientEmail, // Explicitly set recipient email
        recipient_email: recipientEmail, // Duplicate to ensure template compatibility
        grade: grade,
        // Additional metadata for debugging
        timestamp: new Date().toISOString()
      };

      console.log('Sending email with params:', templateParams);

      // Perform email send with comprehensive error handling
      const result = await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!, 
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      );

      console.log('Full EmailJS send result:', result);
      
      // More robust status checking
      if (result.status === 200 || result.text === 'OK') {
        setMessage('Email sent successfully to ' + recipientEmail);
        
        // Reset form completely
        setName('');
        setRecipientEmail('');
        setGrade('');
        if (formRef.current) formRef.current.reset();
      } else {
        // Detailed error logging
        console.error('Email send failed:', result);
        setError(`Failed to send email. Status: ${result.status}`);
      }
    } catch (err) {
      // Comprehensive error handling
      console.error('Complete email submission error:', err);
      
      if (err instanceof Error) {
        // More specific error messages
        if (err.message.includes('failed')) {
          setError('Email delivery failed. Please check the email address.');
        } else if (err.message.includes('unauthorized')) {
          setError('Authentication failed. Please check your EmailJS configuration.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      // Ensure loading state is always reset
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Send Grade</h2>
      
      {/* Dynamic error and success messages */}
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2 font-medium">
            Student Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="Enter student name"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="recipientEmail" className="block mb-2 font-medium">
            Recipient Email
          </label>
          <input
            type="email"
            id="recipientEmail"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="Enter recipient email"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="grade" className="block mb-2 font-medium">
            Grade
          </label>
          <input
            type="text"
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="Enter student grade"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 text-white font-medium rounded-md transition-colors ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Sending...' : 'Send Grade'}
        </button>
      </form>
    </div>
  );
}