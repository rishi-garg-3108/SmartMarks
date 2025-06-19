"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { translations } from "../utils/translations";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function GradePage() {
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();
  
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [subject, setSubject] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // NEW: Replaced alert() with a persistent error message state
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // JWT: This effect now protects the route.
  // It checks for a token and redirects to login if it's missing.
  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    return () => {
      // Cleanup object URLs to free memory
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const validFiles = newFiles.filter((file) => file.type.startsWith("image/") && file.size < 5 * 1024 * 1024); // Max 5MB

      if (validFiles.length !== newFiles.length) {
        setErrorMessage("Some files were too large (max 5MB) or were not valid image types.");
      } else {
        setErrorMessage("");
      }

      setImages((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...validFiles.map((file) => URL.createObjectURL(file))]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]); // Cleanup
      return prev.filter((_, i) => i !== index);
    });
  };

  // FIX: Added the 'async' keyword to the function signature
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrorMessage("");

    if (images.length === 0) {
      setErrorMessage("Please upload at least one image before submitting.");
      return;
    }
  
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append("studentName", studentName);
    formData.append("studentClass", studentClass);
    formData.append("subject", subject);
    
    images.forEach((image) => {
      formData.append("images", image);
    });

    // JWT: Get the token from storage
    const token = localStorage.getItem('jwt_token');
  
    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        // JWT: Add the Authorization header to the request
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }
  
      const result = await response.json();
      console.log("Upload successful!", result);
      
      // Navigate to the results page with all necessary info
      router.push(
        `/results?studentName=${encodeURIComponent(studentName)}&studentClass=${encodeURIComponent(studentClass)}&subject=${encodeURIComponent(subject)}`
      );
    } catch (error: any) {
      console.error("Upload error:", error);
      // NEW: Set the persistent error message instead of using alert()
      setErrorMessage(error.message || "An unexpected error occurred during the upload.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t.gradeAssignment}</h1>
        
        {/* NEW: Persistent error message display */}
        {errorMessage && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
                <p>{errorMessage}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.studentDetails}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="studentName">{t.studentName}</Label>
                <Input type="text" id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="studentClass">{t.class}</Label>
                <Input type="text" id="studentClass" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="subject">{t.subject}</Label>
                <Input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.uploadImages}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input type="file" id="images" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" />
            </CardContent>
          </Card>

          {imagePreviews.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>{t.uploadedImages}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={preview}
                        alt={`Uploaded image ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-40 object-cover rounded-md cursor-pointer"
                        onClick={() => setExpandedImage(preview)}
                      />
                      <button
                        type="button" // Important: set type to prevent form submission
                        className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md"
                        onClick={() => handleRemoveImage(index)}
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {expandedImage && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="relative bg-white rounded-md p-4 max-w-[90vw] max-h-[90vh] flex justify-center items-center overflow-hidden">
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full"
                  onClick={() => setExpandedImage(null)}
                >
                  ✖
                </button>
                <TransformWrapper>
                  <TransformComponent>
                    <Image src={expandedImage} alt="Expanded Image" width={800} height={600} className="max-w-[85vw] max-h-[85vh] object-contain" />
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button type="submit" disabled={isProcessing} className="w-full md:w-auto px-6 py-3">
              {isProcessing ? "Processing..." : t.submit}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}