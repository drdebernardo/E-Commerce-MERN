import React from 'react'
import { ShopContext } from '../context/ShopContext';
import { Link } from 'react-router-dom';
import { assets } from '../assets/assets';

const ProductItem = ({ id, image, images, name, price}) => {

    const { currency } = React.useContext(ShopContext);

    // Prefer `images` (from backend) but fall back to `image` (local mocks); provide placeholder if none
    const src = images?.[0] || image?.[0] || assets.p_img1 || assets.hero_img;

  return (
    <Link className='text-gray-700 cursor-pointer' to={`/product/${id}`}>
        <div className='overflow-hidden'>
            <img src={src} className='hover:scale-110 transition ease-in-out' alt={name || "product"} />
        </div>
        <p className='py-3 pb-1 text-sm'>{name}</p>
        <p className='text-sm font-medium'>{currency}{price}</p>
    </Link>

  )
    
}

export default ProductItem