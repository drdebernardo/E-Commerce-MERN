import {v2 as cloudinary} from 'cloudinary';
import productModel from '../models/productModel.js';
import mongoose from 'mongoose';

// function for add product
const addProduct = async (req, res) => {
    try {
        const { name, description, price, category, subCategory, sizes, bestseller } = req.body;
        const image1 = req.files.image1 && req.files.image1[0];
        const image2 = req.files.image2 && req.files.image2[0];
        const image3 = req.files.image3 && req.files.image3[0];
        const image4 = req.files.image4 && req.files.image4[0];

        const images = [image1, image2, image3, image4].filter((item) => item != undefined);
        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, {resource_type: 'image'});
                return result.secure_url;
            })
        )

        // Normalize and validate price (accepts numeric strings, 0, and common currency formats)
        if (price === undefined || price === null || (typeof price === 'string' && price.trim() === '')) {
            return res.status(400).json({ success: false, message: "Invalid price" });
        }
        const normalized = String(price).replace(/[^0-9.-]+/g, '');
        const priceValue = Number(normalized);
        if (isNaN(priceValue)) {
            return res.status(400).json({ success: false, message: "Invalid price" });
        }
        if (priceValue < 0) {
            return res.status(400).json({ success: false, message: "Price must be non-negative" });
        }

        // Parse sizes: allow JSON array, comma-separated string, or array
        let parsedSizes = [];
        if (sizes) {
            if (Array.isArray(sizes)) {
                parsedSizes = sizes;
            } else if (typeof sizes === 'string') {
                try {
                    parsedSizes = JSON.parse(sizes);
                    if (!Array.isArray(parsedSizes)) parsedSizes = sizes.split(',').map(s => s.trim()).filter(Boolean);
                } catch (e) {
                    parsedSizes = sizes.split(',').map(s => s.trim()).filter(Boolean);
                }
            }
        }

        const productData = {
            name,
            description,
            category: category,
            price: priceValue,
            subCategory,
            bestSeller: (bestseller === 'true' || bestseller === true) ? true : false,
            sizes: parsedSizes,
            images: imagesUrl,
            date: Date.now(),
        }

        // Safeguard: ensure price is a valid number before saving
        if (typeof productData.price !== 'number' || isNaN(productData.price)) {
            return res.status(400).json({ success: false, message: "Invalid price" });
        }

        console.log(productData);
        const product = new productModel(productData);
        await product.save();

        res.json({ success: true, message: "Product added successfully" });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
}

// function for list product
const listProducts = async (req, res) => {
    try {
        const products = await productModel.find({});
        res.json({ success: true, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// function for removing product
const removeProduct = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.query.id;
        if (!id) return res.status(400).json({ success: false, message: "Product id is required" });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid product id" });

        const deleted = await productModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, message: "Product removed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// function for product info
const singleProduct = async (req, res) => {
    try {
        const id = req.params.id || req.query.id || req.body.productId || req.body.id;
        if (!id) return res.status(400).json({ success: false, message: "Product id is required" });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid product id" });

        const product = await productModel.findById(id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const isBestSeller = product.bestSeller === true;
        const response = { success: true, product, isBestSeller };
        if (!isBestSeller) response.message = "bestSeller: false";

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });   
    }
}

export { addProduct, listProducts, removeProduct, singleProduct };