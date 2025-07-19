const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the Event model
const Event = require('../models/event');

// Sample data for generating realistic events
const sampleData = {
  titles: [
    "Tech Innovation Summit 2024",
    "Creative Design Workshop",
    "Business Networking Mixer",
    "Music Festival Experience",
    "Health & Wellness Seminar",
    "Startup Pitch Competition",
    "Art Exhibition Opening",
    "Cooking Masterclass",
    "Sports Training Camp",
    "Environmental Conference"
  ],
  
  categories: ['conference', 'workshop', 'seminar', 'networking', 'social', 'other'],
  
  locations: [
    {
      name: "Zurich Convention Center",
      address: {
        street: "Messeplatz 1",
        city: "Zurich",
        state: "Zurich",
        postalCode: "8005",
        country: "Switzerland"
      },
      coordinates: { latitude: 47.3769, longitude: 8.5417 }
    },
    {
      name: "Geneva Business Hub",
      address: {
        street: "Rue du Rhône 65",
        city: "Geneva",
        state: "Geneva",
        postalCode: "1204",
        country: "Switzerland"
      },
      coordinates: { latitude: 46.2044, longitude: 6.1432 }
    },
    {
      name: "Basel Innovation Center",
      address: {
        street: "Aeschenvorstadt 55",
        city: "Basel",
        state: "Basel-Stadt",
        postalCode: "4051",
        country: "Switzerland"
      },
      coordinates: { latitude: 47.5596, longitude: 7.5886 }
    },
    {
      name: "Bern Conference Hall",
      address: {
        street: "Bundesgasse 8",
        city: "Bern",
        state: "Bern",
        postalCode: "3011",
        country: "Switzerland"
      },
      coordinates: { latitude: 46.9479, longitude: 7.4474 }
    },
    {
      name: "Lausanne Tech Campus",
      address: {
        street: "Avenue de la Gare 10",
        city: "Lausanne",
        state: "Vaud",
        postalCode: "1003",
        country: "Switzerland"
      },
      coordinates: { latitude: 46.5197, longitude: 6.6323 }
    }
  ],
  
  onlineLocations: [
    {
      name: "Virtual Conference Platform",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      online: true
    },
    {
      name: "Zoom Webinar",
      meetingLink: "https://zoom.us/j/123456789",
      online: true
    },
    {
      name: "Microsoft Teams Meeting",
      meetingLink: "https://teams.microsoft.com/l/meetup-join/123456",
      online: true
    }
  ],
  
  speakers: [
    {
      name: "Dr. Sarah Johnson",
      role: "CEO & Founder",
      about: "Dr. Johnson is a renowned expert in technology innovation with over 15 years of experience in the industry. She has led multiple successful startups and is passionate about mentoring young entrepreneurs.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Michael Chen",
      role: "Creative Director",
      about: "Michael is an award-winning designer with expertise in user experience and brand development. He has worked with major brands across Europe and Asia.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Emma Rodriguez",
      role: "Marketing Strategist",
      about: "Emma specializes in digital marketing and growth strategies. She has helped over 100 companies scale their online presence and increase revenue.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "David Thompson",
      role: "Financial Advisor",
      about: "David has over 20 years of experience in financial planning and investment strategies. He regularly speaks at international conferences on wealth management.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Lisa Wang",
      role: "Sustainability Expert",
      about: "Lisa is a leading expert in environmental sustainability and green business practices. She advises Fortune 500 companies on reducing their carbon footprint.",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    }
  ],
  
  tags: [
    "technology", "innovation", "networking", "business", "startup", "design", "marketing", 
    "finance", "sustainability", "health", "wellness", "art", "music", "sports", "cooking",
    "education", "leadership", "creativity", "growth", "strategy"
  ],
  
  additionalFields: [
    {
      title: "What to Bring",
      content: "Please bring your laptop, notebook, and any relevant materials. Business cards are recommended for networking."
    },
    {
      title: "Dress Code",
      content: "Business casual attire is recommended. Comfortable shoes for walking tours."
    },
    {
      title: "Parking Information",
      content: "Free parking available on-site. Alternative parking at nearby public lots."
    },
    {
      title: "Accessibility",
      content: "The venue is fully accessible with ramps, elevators, and accessible restrooms. Please contact us for special accommodations."
    },
    {
      title: "COVID-19 Safety",
      content: "Masks are optional but recommended. Hand sanitizer will be provided throughout the venue."
    }
  ]
};

// Generate random date within next 6 months
const generateRandomDate = () => {
  const now = new Date();
  const future = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000)); // 6 months from now
  const randomTime = now.getTime() + Math.random() * (future.getTime() - now.getTime());
  return new Date(randomTime);
};

// Generate random time
const generateRandomTime = () => {
  const hours = Math.floor(Math.random() * 12) + 9; // 9 AM to 8 PM
  const minutes = Math.random() < 0.5 ? 0 : 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Generate random price
const generateRandomPrice = () => {
  const prices = [0, 25, 50, 75, 100, 150, 200, 300, 500];
  return prices[Math.floor(Math.random() * prices.length)];
};

// Generate random capacity
const generateRandomCapacity = () => {
  const capacities = [20, 50, 100, 200, 500, 1000];
  return capacities[Math.floor(Math.random() * capacities.length)];
};

// Generate slug from title
const generateSlug = (title, index) => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
    
  // Add a timestamp to ensure uniqueness
  return `${baseSlug}-${Date.now().toString().slice(-6)}-${index}`;
};

// Generate event data
const generateEventData = (index) => {
  const isOnline = Math.random() < 0.3; // 30% chance of online event
  const startDate = generateRandomDate();
  const endDate = new Date(startDate.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000); // 1-4 days duration
  const registrationDeadline = new Date(startDate.getTime() - (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000); // 1-8 days before
  
  const title = sampleData.titles[index];
  const category = sampleData.categories[Math.floor(Math.random() * sampleData.categories.length)];
  const location = isOnline 
    ? sampleData.onlineLocations[Math.floor(Math.random() * sampleData.onlineLocations.length)]
    : sampleData.locations[Math.floor(Math.random() * sampleData.locations.length)];
  
  const priceAmount = generateRandomPrice();
  const isFree = priceAmount === 0;
  const capacity = generateRandomCapacity();
  
  // Calculate platform fee based on duration
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const platformFee = durationHours <= 24 ? 350 : 675;
  
  // Generate random speakers (1-3 speakers)
  const numSpeakers = Math.floor(Math.random() * 3) + 1;
  const selectedSpeakers = [];
  const speakerIndices = [];
  while (speakerIndices.length < numSpeakers) {
    const index = Math.floor(Math.random() * sampleData.speakers.length);
    if (!speakerIndices.includes(index)) {
      speakerIndices.push(index);
      selectedSpeakers.push(sampleData.speakers[index]);
    }
  }
  
  // Generate random tags (2-5 tags)
  const numTags = Math.floor(Math.random() * 4) + 2;
  const selectedTags = [];
  const tagIndices = [];
  while (tagIndices.length < numTags) {
    const index = Math.floor(Math.random() * sampleData.tags.length);
    if (!tagIndices.includes(index)) {
      tagIndices.push(index);
      selectedTags.push(sampleData.tags[index]);
    }
  }
  
  // Generate random additional fields (1-3 fields)
  const numAdditionalFields = Math.floor(Math.random() * 3) + 1;
  const selectedAdditionalFields = [];
  const fieldIndices = [];
  while (fieldIndices.length < numAdditionalFields) {
    const index = Math.floor(Math.random() * sampleData.additionalFields.length);
    if (!fieldIndices.includes(index)) {
      fieldIndices.push(index);
      selectedAdditionalFields.push(sampleData.additionalFields[index]);
    }
  }
  
  // Generate age range (optional)
  const hasAgeRange = Math.random() < 0.4;
  const ageRange = hasAgeRange ? {
    min: Math.floor(Math.random() * 10) + 18,
    max: Math.floor(Math.random() * 30) + 50
  } : {};
  
  return {
    title,
    slug: generateSlug(title, index),
    smallDescription: `Join us for an exciting ${category} event featuring industry experts and networking opportunities.`,
    aboutEvent: `This comprehensive ${category} brings together professionals, experts, and enthusiasts from around the world. Our carefully curated program includes keynote presentations, interactive workshops, and networking sessions designed to provide valuable insights and foster meaningful connections. Whether you're a seasoned professional or just starting your journey, this event offers something for everyone.`,
    
    startDate,
    endDate,
    startTime: generateRandomTime(),
    endTime: generateRandomTime(),
    registrationDeadline,
    
    category,
    capacity,
    
    isOnline,
    location: isOnline ? {
      name: location.name,
      address: {
        street: "Virtual Event",
        city: "Online",
        postalCode: "00000",
        country: "Worldwide"
      },
      meetingLink: location.meetingLink,
      online: true
    } : {
      name: location.name,
      address: location.address,
      coordinates: location.coordinates,
      online: false
    },
    
    isFree,
    price: {
      amount: priceAmount,
      currency: 'CHF',
      platformFee
    },
    
    tags: selectedTags,
    isPublic: true,
    
    coverImage: `https://images.unsplash.com/photo-${1500000000 + index}?w=800&h=400&fit=crop`,
    galleryImages: [
      `https://images.unsplash.com/photo-${1500000001 + index}?w=600&h=400&fit=crop`,
      `https://images.unsplash.com/photo-${1500000002 + index}?w=600&h=400&fit=crop`,
      `https://images.unsplash.com/photo-${1500000003 + index}?w=600&h=400&fit=crop`
    ],
    
    refundPolicy: "Full refund available up to 7 days before the event. 50% refund available up to 24 hours before the event. No refunds within 24 hours of the event.",
    eventIncludes: "Access to all sessions\nNetworking opportunities\nLunch and refreshments\nEvent materials and resources\nCertificate of participation",
    
    ageRange,
    arriveBy: "Please arrive 15 minutes before the event start time for registration and check-in.",
    deliverBy: "All materials will be provided on-site. No need to bring additional items.",
    
    speakers: selectedSpeakers,
    additionalFields: selectedAdditionalFields,
    
    seo: {
      metaTitle: `${title} - Join the Ultimate ${category.charAt(0).toUpperCase() + category.slice(1)} Experience`,
      metaDescription: `Don't miss this exclusive ${category} featuring industry experts, networking opportunities, and valuable insights. Register now for ${title}!`,
      ogImage: `https://images.unsplash.com/photo-${1500000004 + index}?w=1200&h=630&fit=crop`
    },
    
    organizer: "687b67170e9d9611a69c6b2c",
    status: "pending_payment",
    isPaid: false
  };
};

// Main seeding function
const seedEvents = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zafo-app');
    console.log('Connected to MongoDB');
    
    // Clear existing events with pending_payment status for this organizer
    await Event.deleteMany({ 
      organizer: "687b67170e9d9611a69c6b2c",
      status: "pending_payment" 
    });
    console.log('Cleared existing pending payment events for organizer');
    
    // Generate and insert 10 events
    const events = [];
    for (let i = 0; i < 10; i++) {
      const eventData = generateEventData(i);
      events.push(eventData);
    }
    
    const insertedEvents = await Event.insertMany(events);
    console.log(`Successfully created ${insertedEvents.length} events with pending payment status`);
    
    // Display summary
    console.log('\n=== EVENTS CREATED ===');
    insertedEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   Category: ${event.category}`);
      console.log(`   Location: ${event.isOnline ? 'Online' : event.location.name}`);
      console.log(`   Date: ${event.startDate.toLocaleDateString()}`);
      console.log(`   Price: ${event.isFree ? 'Free' : `${event.price.amount} ${event.price.currency}`}`);
      console.log(`   Platform Fee: ${event.price.platformFee} CHF`);
      console.log(`   Status: ${event.status}`);
      console.log('');
    });
    
    console.log('Seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding events:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeding function
if (require.main === module) {
  seedEvents();
}

module.exports = { seedEvents }; 