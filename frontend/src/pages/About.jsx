import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import NewsletterBox from '../components/NewsletterBox'

const About = () => {
  return (
    <div>
      <div className='text-2xl text-center pt-8 border-t'>
        <Title text1={'ABOUT'} text2={'US'} />
      </div>
      <div className='my-10 flex flex-col md:flex-row gap-16'>
        <img className='w-full md:max-w-[450px]' src={assets.about_img} alt="" />
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-gray-600'>
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae quisquam doloremque sed, a ea, corrupti ullam rerum ex facere necessitatibus laborum obcaecati numquam dolores odit voluptate dicta. Dicta, quos incidunt.</p>
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus possimus cupiditate explicabo voluptates illo alias, commodi velit ex harum, beatae laudantium ratione rerum iure, voluptatum rem fuga quisquam architecto temporibus!</p>
          <b className='text-gray-800'>Our Mission</b>
          <p>Our mission is to provide high-quality products at affordable prices, while maintaining exceptional customer service and sustainability practices.</p>
        </div>
      </div>

      <div className='text-4xl py-4'>
        <Title text1={'WHY'} text2={'CHOOSE US'} />
      </div>

      <div className='flex flex-col md:flex-row text-sm mb-20'>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
          <b>Quality Assurance:</b>
          <p className='text-gray-600'>All our products are thoroughly tested for quality and safety before shipping.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
          <b>Fast Delivery:</b>
          <p className='text-gray-600'>We offer fast and reliable delivery options to get your products to you quickly.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
          <b>Customer Support:</b>
          <p className='text-gray-600'>Our dedicated support team is available 24/7 to assist you with any questions or concerns.</p>
        </div>
      </div>

      <NewsletterBox />   
    </div>
  )
}

export default About