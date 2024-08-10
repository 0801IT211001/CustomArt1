import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSnapshot } from "valtio";
import Razorpay from "razorpay";
import axios from "axios";  // You might need axios for API requests

import config from "../config/config";
import state from "../store";
import { download } from "../assets";
import { downloadCanvasToImage, reader } from "../config/helpers";
import {
  EditorTabs,
  DecalTypes,
  FilterTabs,
  Download,
} from "../config/constants";
import { fadeAnimation, slideAnimation } from "../config/motion";
import Tab from "../components/Tab";
import CustomButton from "../components/CustomButton";
import ColorPicker from "../components/ColorPicker";
import FilePicker from "../components/FilePicker";
import AIPicker from "../components/AIPicker";

const Customizer = () => {
  const snap = useSnapshot(state);

  const [file, setFile] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState();
  const [activeFilterTab, setActiveFilterTab] = useState({
    logoShirt: true,
    stylishShirt: false,
  });

  const generateTabContent = () => {
    switch (activeEditorTab) {
      case "colorpicker":
        return <ColorPicker />;
      case "filepicker":
        return <FilePicker file={file} setFile={setFile} readFile={readFile} />;
      case "aipicker":
        return (
          <AIPicker
            prompt={prompt}
            setPrompt={setPrompt}
            generatingImg={generatingImg}
            handleSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  const handlePayment = async () => {
    console.log("Buy Now button clicked");
    const amount = 500; // Store amount in a variable for consistency
  
    try {
      // 1. Fetch Razorpay key from backend
      console.log("Fetching Razorpay key...");
      const keyResponse = await axios.get("http://localhost:8080/api/razorpay-key");
      const key = keyResponse.data.key;
      console.log("Razorpay key fetched successfully");
  
      // 2. Create an order
      console.log("Creating order...");
      const orderResponse = await axios.post("http://localhost:8080/api/orders", { amount });
      const { id: order_id, amount: orderAmount, currency } = orderResponse.data;
      console.log("Order created successfully", { order_id, amount: orderAmount, currency });
  
      // 3. Initialize Razorpay
      console.log("Initializing Razorpay...");
      const options = {
        key: key,
        amount: orderAmount,
        currency: currency,
        name: "Custom T-Shirt",
        description: "Thank you for your purchase",
        order_id: order_id,
        handler: async (response) => {
          console.log("Payment successful, capturing payment...");
          const paymentId = response.razorpay_payment_id;
  
          console.log("Current state:", snap);
  
          // 4. Capture the image
          console.log("Attempting to capture image...");
          const image = downloadCanvasToImage();
          console.log("Captured image:", image ? "Image captured successfully" : "Image capture failed");
  
          if (!image) {
            console.error("No image available to upload!");
            alert("No image available to upload!");
            return;
          }
  
          // Check image size (assuming image is a base64 string)
          const imageSizeInBytes = Math.ceil((image.length / 4) * 3);
          const imageSizeInMB = imageSizeInBytes / (1024 * 1024);
          if (imageSizeInMB > 10) { // Adjust this threshold as needed
            alert("Image size too large. Please use an image smaller than 10MB.");
            return;
          }
  
          console.log("Capturing payment and uploading image...");
          try {
            const captureResponse = await axios.post(`http://localhost:8080/api/capture/${paymentId}`, {
              amount,
              image: image,
            }, {
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            });
            console.log('Capture response:', captureResponse.data);
  
            if (captureResponse.data.imageUrl) {
              console.log("Payment captured and image uploaded successfully");
              alert("Payment successful and image uploaded!");
            } else {
              console.error("Payment captured but image upload failed");
              alert("Payment successful but image upload failed");
            }
          } catch (uploadError) {
            console.error("Error during capture/upload:", uploadError);
            if (uploadError.response && uploadError.response.status === 413) {
              alert("Image too large to upload. Please try a smaller image.");
            } else if (uploadError.response && uploadError.response.data) {
              alert(`Payment successful but upload failed: ${uploadError.response.data}`);
            } else {
              alert(`Payment successful but upload failed: ${uploadError.message}`);
            }
          }
        },
        prefill: {
          name: "John Doooe",
          email: "john@example.com",
          contact: "9999999789",
        },
        notes: {
          address: "Custom T-Shirt Address",
        },
        theme: {
          color: "#F37254",
        },
      };
  
      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error("Razorpay SDK is not loaded");
      }
  
      const rzp = new window.Razorpay(options);
      rzp.open();
  
    } catch (error) {
      console.error("Payment failed:", error.response ? error.response.data : error.message);
      alert(`Payment failed: ${error.response ? error.response.data : error.message}`);
    }
  };
  

  const handleSubmit = async (type) => {
    if (!prompt) return alert("Please enter the prompt!");

    try {
      setGeneratingImg(true);

      const response = await fetch("http://localhost:8080/api/v1/dalle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      handleDecal(type, `data:image/png;base64,${data.photo}`);
    } catch (error) {
      alert(error);
    } finally {
      setGeneratingImg(false);
      setActiveEditorTab("");
    }
  };

  const handleDecal = (type, res) => {
    const decalType = DecalTypes[type];
    state[decalType.stateProperty] = res;

    if (!activeFilterTab[decalType.filterTab]) {
      handleActiveFilterTab(decalType.filterTab);
    }
  };

  const handleActiveFilterTab = (tabName) => {
    switch (tabName) {
      case "logoShirt":
        state.isLogoTexture = !activeFilterTab[tabName];
        break;
      case "stylishShirt":
        state.isFullTexture = !activeFilterTab[tabName];
        break;
      default:
        state.isLogoTexture = true;
        state.isFullTexture = false;
        break;
    }

    setActiveFilterTab((prevState) => {
      return {
        ...prevState,
        [tabName]: !prevState[tabName],
      };
    });
  };

  const readFile = (type) => {
    reader(file).then((res) => {
      handleDecal(type, res);
      setActiveEditorTab("");
    });
  };

  return (
    <AnimatePresence>
      {!snap.intro && (
        <>
          <motion.div
            key="custom"
            className="absolute top-0 left-0 z-10"
            {...slideAnimation("left")}
          >
            <div className="flex items-center min-h-screen">
              <div className="editortabs-container tabs">
                {EditorTabs.map((tab) => (
                  <Tab
                    key={tab.name}
                    tab={tab}
                    handleClick={() => {
                      setActiveEditorTab(tab.name);
                    }}
                  />
                ))}
                {generateTabContent()}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute z-10 top-5 right-5"
            {...fadeAnimation}
          >
            <CustomButton
              type="filled"
              title="Go Back"
              handleClick={() => (state.intro = true)}
              customStyles="w-fit px-4 py-2.5 font-bold text-sm"
            />
          </motion.div>

          <motion.div
            className="filtertabs-container tabs"
            {...slideAnimation("up")}
          >
            {FilterTabs.map((tab) => (
              <Tab
                key={tab.name}
                tab={tab}
                isFilterTab
                isActiveTab={activeFilterTab[tab.name]}
                handleClick={() => handleActiveFilterTab(tab.name)}
              />
            ))}

            {Download.map((tab) => (
              <Tab
                tab={tab}
                key={tab.name}
                isActiveTab={activeFilterTab[tab.name]}
                handleClick={() => downloadCanvasToImage()}
              />
            ))}
          </motion.div>

          {/* Razorpay Payment Button */}
          <motion.div
               className="absolute z-10 bottom-5 right-5"
                   {...fadeAnimation}
            >
            <CustomButton
             type="filled"
             title="Buy Now"
             handleClick={handlePayment}
            customStyles="w-fit px-4 py-2.5 font-bold text-sm"
            />
          </motion.div>


        </>
      )}
    </AnimatePresence>
  );
};

export default Customizer;
