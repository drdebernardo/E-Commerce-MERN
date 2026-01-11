import React, { useContext, useState } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { assets } from '../assets/assets'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import { toast } from 'react-toastify' 

const PlaceOrder = () => {
  const [method, setMethod] = useState('cod');
  const { navigate, backendUrl, token, cartItems, setCartItems, getCartAmount, delivery_fee, products } = useContext(ShopContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    phone: ''
  });

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setFormData(data => ({...data, [name]: value}));
  }

  const initPay = (order, orderData) => {
    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!key) {
      console.error('Razorpay key missing. Ensure VITE_RAZORPAY_KEY_ID is set in the project root .env and restart dev server.');
      toast.error('Razorpay key missing — check frontend/.env');
      return;
    }

    if (!order || !order.id) {
      console.error('Invalid Razorpay order object:', order);
      toast.error('Invalid Razorpay order data');
      return;
    }

    const options = {
      key,
      amount: order.amount,
      currency: order.currency || 'USD',
      name: 'Order Payment',
      description: 'Order Payment',
      order_id: order.id,
      receipt: order.receipt,
      prefill: {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        contact: formData.phone
      },
      handler: async (response) => {
        console.log('Razorpay payment response:', response);
        // Verify payment with backend
        try {
          // Extract userId from token (JWT)
          let userId = '';
          try {
            const payload = token.split('.')[1];
            userId = JSON.parse(atob(payload)).id;
          } catch (e) {
            console.error('Failed to extract userId from token:', e);
          }
          const verifyResponse = await axios.post(backendUrl + '/api/order/verifyRazorpay', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderData: { ...orderData, userId }
          }, { headers: { token } });
          console.log('Razorpay verification response:', verifyResponse.data);
          if (verifyResponse.data.success) {
            toast.success('Payment verified successfully!');
            setCartItems({});
            // Clear cart in backend
            await axios.post(backendUrl + '/api/cart/clear', { userId }, { headers: { token } });
            navigate('/orders');
          } else {
            toast.error(verifyResponse.data.message || 'Payment verification failed');
          }
        } catch (error) {
          console.error('Razorpay verification error:', error);
          toast.error('Payment verification error: ' + (error.response?.data?.message || error.message));
        }
      }
    }

    try {
      if (!window.Razorpay) {
        console.error('Razorpay checkout script not loaded (window.Razorpay is undefined)');
        toast.error('Razorpay script not loaded');
        return;
      }
      console.log('Razorpay options:', options);
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay init/open error:', err);
      toast.error('Razorpay initialization error: ' + (err.message || 'See console'));
    }
  }

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      let orderItems = [];
      for (const items in cartItems) {
        for (const item in cartItems[items]) {
          if (cartItems[items][item] > 0) {
            const itemInfo = structuredClone(products.find(product => product._id === items));
            if (itemInfo) {
              itemInfo.size = item;
              itemInfo.quantity = cartItems[items][item];
              orderItems.push(itemInfo);
            }
          }
        }
      }
      let orderData = {
        address: formData,
        items: orderItems,
        amount: getCartAmount() + delivery_fee
      }
      switch (method) {
        // API calls for COD
        case 'cod':   
          console.log('Placing order:', orderData);
          const response = await axios.post(backendUrl + '/api/order/place', orderData, {headers: {token}});
          console.log('Order response:', response.data);
          if (response.data.success) {
            console.log('Order placed successfully');
            setCartItems({});
            navigate('/orders');
          } else {
            toast.error(response.data.message);
          }
          break;

          case 'stripe':
            const responseStripe = await axios.post(backendUrl + '/api/order/stripe', orderData, {headers: {token}});
            if (responseStripe.data.success && responseStripe.data.session_url) {
              const {session_url} = responseStripe.data;
              window.location.replace(session_url);
            } else {
              toast.error(responseStripe.data.message || 'Stripe session URL not available');
            }
            break;

            case 'razorpay':
              console.log('Placing Razorpay order:', orderData);
              const responseRazorpay = await axios.post(backendUrl + '/api/order/razorpay', orderData, {headers: {token}});
              console.log('Razorpay response:', responseRazorpay.data);
              if (responseRazorpay.data.success) {
                initPay(responseRazorpay.data.order, orderData);
              } else {
                toast.error(responseRazorpay.data.message || 'Razorpay order failed');
              }
              break;
        default: 
          break;
      }
    } catch (error) {
      console.error('PlaceOrder error:', error.response ? { status: error.response.status, data: error.response.data } : error);
      toast.error(error.response?.data?.message || error.message || 'Failed to place order');
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-top'>
      {/* Left Side */}
      <div className='flex flex-col gap-4 w-full sm:max-w-[480px]'>
        <div className='text-xl sm:text-2xl my-3'>
          <Title text1={'DELIVERY'} text2={'INFORMATION'} />
        </div>
        <div className='flex gap-3'>
          <input required onChange={onChangeHandler} name='firstName' value={formData.firstName} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='First name' />
          <input required onChange={onChangeHandler} name='lastName' value={formData.lastName} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Last name' />
        </div>
        <input required onChange={onChangeHandler} name='email' value={formData.email} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="email" placeholder='Email Address' />
        <input required onChange={onChangeHandler} name='street' value={formData.street} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Street' />
        <div className='flex gap-3'>
          <input required onChange={onChangeHandler} name='city' value={formData.city} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='City' />
          <input required onChange={onChangeHandler} name='state' value={formData.state} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='State' />
        </div>
        <div className='flex gap-3'>
          <input required onChange={onChangeHandler} name='zipcode' value={formData.zipcode} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="number" placeholder='Zipcode' />
          <input required onChange={onChangeHandler} name='country' value={formData.country} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Country' />
        </div>
        <input required onChange={onChangeHandler} name='phone' value={formData.phone} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="number" placeholder='Phone Number' />
      </div>

      {/* Right Side */}
      <div className='my-8'>
        <div className='mt-8 min-w-80'>
          <CartTotal />
        </div>
        <div className='mt-12'>
          <Title text1={'PAYMENT'} text2={'METHOD'} />

          {/* Payment Method Options */}
          <div className='flex gap-3 flex-col lg:flex-row'>
            <div onClick={()=>setMethod('stripe')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'stripe' ? 'bg-green-400' : ''}`}></p>
              <img className='h-5 mx-4' src={assets.stripe_logo} alt="" />
            </div>
            <div onClick={()=>setMethod('razorpay')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'razorpay' ? 'bg-green-400' : ''}`}></p>
              <img className='h-5 mx-4' src={assets.razorpay_logo} alt="" />
            </div>
            <div onClick={()=>setMethod('cod')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'cod' ? 'bg-green-400' : ''}`}></p>
              <p className='text-gray-500 text-sm font-medium mx-4'>CASH ON DELIVERY</p>
            </div>
          </div>
          <div className='w-full text-end mt-8'>
            <button type='submit' className='bg-black text-white py-3 px-16 text-sm'>PLACE ORDER</button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default PlaceOrder