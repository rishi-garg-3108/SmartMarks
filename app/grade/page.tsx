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
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
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
        setErrorMessage("Some files were too large or not images.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit button clicked!"); // Debugging log
  
    if (images.length === 0) {
      console.log("No images selected!");
      alert("Please upload at least one image.");
      return;
    }
  
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append("studentName", studentName);
    formData.append("studentClass", studentClass);
    formData.append("subject", subject);
    
    images.forEach((image, index) => {
      formData.append("images", image);
    });
  
    try {
      console.log("Sending request to backend...");
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });
  
      console.log("Response received:", response);
  
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
  
      const result = await response.json();
      console.log("Upload successful!", result);
      
      router.push(
        `/results?studentName=${encodeURIComponent(studentName)}&studentClass=${encodeURIComponent(studentClass)}&subject=${encodeURIComponent(subject)}`
      );
    } catch (error) {
      console.error("Upload error:", error);
      alert("Image upload failed! Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };
  

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t.gradeAssignment}</h1>
        
        {errorMessage && <div className="text-red-600 text-center mb-4">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.studentDetails}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="studentName">{t.studentName}</Label>
              <Input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
              <Label htmlFor="studentClass">{t.class}</Label>
              <Input
                type="text"
                id="studentClass"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                required
              />
              <Label htmlFor="subject">{t.subject}</Label>
              <Input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.uploadImages}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                id="images"
                ref={fileInputRef}
                onChange={handleImageUpload}
                multiple
                accept="image/*"
                required
              />
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
                        alt={`Uploaded image ${index + 1} - ${studentName}`}
                        width={200}
                        height={200}
                        className="w-full h-40 object-cover rounded-md cursor-pointer"
                        onClick={() => setExpandedImage(preview)}
                      />
                      <button
                        className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md shadow-md hover:bg-red-700 transition-transform transform hover:scale-110"
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
                  className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full"
                  onClick={() => setExpandedImage(null)}
                >
                  ✖
                </button>
                <TransformWrapper>
                  <TransformComponent>
                    <Image
                      src={expandedImage}
                      alt="Expanded Image"
                      width={800}
                      height={600}
                      className="max-w-[85vw] max-h-[85vh] object-contain"
                    />
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button type="submit" disabled={isProcessing} className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
              {isProcessing ? "Processing..." : t.submit}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
