import { 
  EmergencyIncident, 
  ReliefShelter, 
  Responder, 
  VolunteerTask, 
  ResourceInventory, 
  DonationRecord, 
  BroadcastAlert, 
  AuditLogEntry 
} from '../types';

export const INITIAL_ALERTS: BroadcastAlert[] = [
  {
    id: 'alt-01',
    title: 'RED ALERT: Yamuna Water Level Crossed Danger Mark (208.66m)',
    message: 'High discharge from Hathnikund Barrage. Evacuation mandatory for low-lying areas of Yamuna Bazaar, Mayur Vihar Khadar, and Monastery Market. Move to designated relief camps.',
    severity: 'CRITICAL_EVACUATION',
    issuedAt: '15 mins ago',
    affectedZones: ['Yamuna Bazaar', 'Mayur Vihar Ph-1', 'Monastery Market', 'Geeta Colony'],
    expiresAt: '24 hours'
  },
  {
    id: 'alt-02',
    title: 'DRINKING WATER TRUCKS DISPATCHED',
    message: 'Delhi Jal Board 10,000L water tankers deployed at Kashmere Gate and Akshardham relief camps. Rations distribution active.',
    severity: 'INFO',
    issuedAt: '42 mins ago',
    affectedZones: ['Kashmere Gate ISBT', 'Akshardham Flyover Staging'],
    expiresAt: '12 hours'
  }
];

export const INITIAL_EMERGENCIES: EmergencyIncident[] = [
  {
    id: 'inc-01',
    ticketNumber: 'RS-901',
    title: 'Family of 6 Stranded on Submerged Rooftop',
    description: 'Water has reached first-floor lintel level. 2 children and 1 elderly grandmother with diabetes requiring insulin. Current is strong, wooden boat capsized.',
    urgency: 'CRITICAL',
    category: ['RESCUE', 'MEDICAL', 'FLOOD_EVACUATION'],
    status: 'ASSIGNED',
    location: {
      lat: 28.6625,
      lng: 27.2410, // will correct to 77.2410
      address: 'Near Old Iron Bridge, Yamuna Bazaar, North Delhi',
      landmark: 'Behind Hanuman Mandir ghat'
    },
    peopleCount: 6,
    reportedAt: '12 mins ago',
    isAnonymous: true,
    isForOther: false,
    mediaUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    voiceMemoDuration: 18,
    trustScore: 96,
    aiAnalysis: {
      urgencyScore: 'CRITICAL',
      detectedHazards: ['Rapid flood current', 'Submerged power grid', 'Critical medical dependency (Insulin)'],
      recommendedResources: ['Motorized rescue boat', 'Paramedic with cold-chain insulin', 'Life jackets x6'],
      peopleEstimate: 6,
      confidenceScore: 0.96,
      summary: 'High probability of roof structure destabilization due to 5ft current. Immediate motorized boat extraction required.'
    },
    assignedResponderId: 'resp-01',
    assignedResponderName: 'NDRF Boat Unit 04',
    assignedAt: '8 mins ago'
  },
  {
    id: 'inc-02',
    ticketNumber: 'RS-902',
    title: 'Live Transformer Sparking in Waterlogged Colony',
    description: 'Submerged transformer sparking into floodwater where residents are wading to evacuate. 4 people trapped inside ground floor grocery shop.',
    urgency: 'CRITICAL',
    category: ['POWER_COMMS', 'RESCUE'],
    status: 'REPORTED',
    location: {
      lat: 28.6045,
      lng: 77.2980,
      address: 'Gali 4, Mayur Vihar Phase 1 Khadar',
      landmark: 'Opposite Government Dispensary'
    },
    peopleCount: 4,
    reportedAt: '18 mins ago',
    isAnonymous: true,
    isForOther: true,
    affectedPersonName: 'Sunil Verma (Shop Owner)',
    reporterPhone: '+91 98112 44321',
    trustScore: 89,
    aiAnalysis: {
      urgencyScore: 'CRITICAL',
      detectedHazards: ['Electrocution hazard in standing water', 'Structural blockage'],
      recommendedResources: ['Discom grid shutdown team', 'Dry-suit rescue crew'],
      peopleEstimate: 4,
      confidenceScore: 0.91,
      summary: 'Extreme risk of electrocution. Power grid disconnect required before physical extraction.'
    }
  },
  {
    id: 'inc-03',
    ticketNumber: 'RS-903',
    title: 'Pregnant Woman in Active Labor at Cutoff Slum Cluster',
    description: 'Road access flooded with 4 feet muddy water. Woman in advanced labor stage, no ambulance can enter road.',
    urgency: 'HIGH',
    category: ['MEDICAL', 'RESCUE'],
    status: 'IN_PROGRESS',
    location: {
      lat: 28.6470,
      lng: 77.2720,
      address: 'Pushta Road, Geeta Colony, East Delhi',
      landmark: 'Near Shamshan Ghat Puliya'
    },
    peopleCount: 2,
    reportedAt: '25 mins ago',
    isAnonymous: false,
    reporterName: 'Pooja Rawat (ASHA Worker)',
    reporterPhone: '+91 98731 22901',
    isForOther: true,
    affectedPersonName: 'Radha Devi',
    trustScore: 98,
    aiAnalysis: {
      urgencyScore: 'HIGH',
      detectedHazards: ['Obstetric emergency', 'Impassable vehicle road'],
      recommendedResources: ['Obstetric kit', 'High-axle rescue ambulance / boat'],
      peopleEstimate: 2,
      confidenceScore: 0.98,
      summary: 'Verified medical emergency reported by registered ASHA healthcare worker.'
    },
    assignedResponderId: 'resp-03',
    assignedResponderName: 'Red Cross Medical Unit 9',
    assignedAt: '14 mins ago'
  },
  {
    id: 'inc-04',
    ticketNumber: 'RS-904',
    title: '35 Evacuees on Flyover Without Clean Water or ORS',
    description: 'Displaced families moved up onto flyover slope. Children showing signs of dehydration and gastroenteritis. Need clean drinking water tankers immediately.',
    urgency: 'MEDIUM',
    category: ['FOOD_WATER', 'MEDICAL'],
    status: 'REPORTED',
    location: {
      lat: 28.5880,
      lng: 77.2550,
      address: 'Sarai Kale Khan Ring Road Flyover Ramp',
      landmark: 'Near Hazrat Nizamuddin Railway Exit'
    },
    peopleCount: 35,
    reportedAt: '45 mins ago',
    isAnonymous: true,
    isForOther: false,
    trustScore: 78,
    aiAnalysis: {
      urgencyScore: 'MEDIUM',
      detectedHazards: ['Dehydration', 'Waterborne disease outbreak risk'],
      recommendedResources: ['Drinking water cans (200L)', 'ORS sachets', 'Baby food'],
      peopleEstimate: 35,
      confidenceScore: 0.85,
      summary: 'Resource shortage without immediate structural collapse. High priority for NGO supply dispatch.'
    }
  },
  {
    id: 'inc-05',
    ticketNumber: 'RS-905',
    title: 'Elderly Couple Stranded with Disabled Wheelchair',
    description: 'Ground floor inundated with 1.5ft water. Elevator power disconnected. Couple cannot climb staircase to upper floors.',
    urgency: 'HIGH',
    category: ['RESCUE', 'SHELTER'],
    status: 'REPORTED',
    location: {
      lat: 28.6667,
      lng: 77.2280,
      address: 'Civil Lines, Rajpur Road',
      landmark: 'Near Delhi Vidhan Sabha back gate'
    },
    peopleCount: 2,
    reportedAt: '1 hour ago',
    isAnonymous: false,
    reporterName: 'Amit Soni (Neighbor)',
    isForOther: true,
    trustScore: 84,
    aiAnalysis: {
      urgencyScore: 'HIGH',
      detectedHazards: ['Mobility impairment', 'Rising ground-floor water'],
      recommendedResources: ['Stretcher evacuation crew', 'Safe transit to Civil Lines shelter'],
      peopleEstimate: 2,
      confidenceScore: 0.89,
      summary: 'Non-ambulatory senior citizens trapped by rising water levels.'
    }
  }
];

// Fix coordinates for inc-01
INITIAL_EMERGENCIES[0].location.lng = 77.2410;

export const INITIAL_SHELTERS: ReliefShelter[] = [
  {
    id: 'shl-01',
    name: 'Kashmere Gate ISBT Gov Relief Camp',
    location: {
      lat: 28.6685,
      lng: 77.2320,
      address: 'Lothian Road, Kashmere Gate',
      landmark: 'Opposite GPO'
    },
    capacity: 500,
    currentOccupancy: 420,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'Dr. Ramesh Chandra (Camp Officer)',
    contactPhone: '+91 98101 55432',
    isOpen: true,
    hasMedicalPost: true,
    hasDrinkingWater: true,
    hasPowerBackup: true
  },
  {
    id: 'shl-02',
    name: 'Yamuna Sports Complex Indoor Stadium Safe Zone',
    location: {
      lat: 28.6530,
      lng: 77.3040,
      address: 'Surajmal Vihar, East Delhi',
      landmark: 'Gate No. 3 Arena'
    },
    capacity: 1200,
    currentOccupancy: 810,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'Sunita Sharma (District Nodal Officer)',
    contactPhone: '+91 99110 88219',
    isOpen: true,
    hasMedicalPost: true,
    hasDrinkingWater: true,
    hasPowerBackup: true
  },
  {
    id: 'shl-03',
    name: 'Mayur Vihar Ph-1 Secondary School Camp',
    location: {
      lat: 28.6010,
      lng: 77.2910,
      address: 'Pocket 2, Mayur Vihar Phase 1',
      landmark: 'Near Acharya Niketan'
    },
    capacity: 350,
    currentOccupancy: 340,
    suppliesStatus: 'CRITICAL_SHORTAGE',
    contactPerson: 'Karan Mehra',
    contactPhone: '+91 97188 33100',
    isOpen: true,
    hasMedicalPost: false,
    hasDrinkingWater: false,
    hasPowerBackup: true
  },
  {
    id: 'shl-04',
    name: 'Akshardham Flyover Elevated Staging Post',
    location: {
      lat: 28.6180,
      lng: 77.2790,
      address: 'NH-24 Elevated Corridor Junction',
      landmark: 'Under metro viaduct'
    },
    capacity: 600,
    currentOccupancy: 490,
    suppliesStatus: 'RESTOCK_EN_ROUTE',
    contactPerson: 'Inspector V.K. Tyagi',
    contactPhone: '+91 98711 00214',
    isOpen: true,
    hasMedicalPost: true,
    hasDrinkingWater: true,
    hasPowerBackup: false
  }
];

export const INITIAL_RESPONDERS: Responder[] = [
  {
    id: 'resp-01',
    name: 'NDRF 8th Battalion - Alpha Team',
    team: 'National Disaster Response Force',
    vehicleType: 'RESCUE_BOAT',
    phone: '+91 94120 77100',
    status: 'DISPATCHED',
    location: {
      lat: 28.6610,
      lng: 77.2390,
      address: 'Approaching Yamuna Bazaar Ghat'
    },
    activeMissionId: 'inc-01',
    equipment: ['40HP Motorized Zodiac Boat', 'Thermal Cameras', 'First Aid Trauma Kit', 'Life Buoys x12']
  },
  {
    id: 'resp-02',
    name: 'Delhi Fire Service Heavy Rescue Team 02',
    team: 'DFS Special Operations',
    vehicleType: 'HIGH_AXLE_TRUCK',
    phone: '+91 98110 10101',
    status: 'AVAILABLE',
    location: {
      lat: 28.6490,
      lng: 77.2450,
      address: 'Connaught Place Fire Staging Area'
    },
    equipment: ['Hydraulic Cutters', 'Inflatable Air Mats', 'High-Output Submersible Pumps']
  },
  {
    id: 'resp-03',
    name: 'Red Cross Mobile Medical Disaster Unit 9',
    team: 'Indian Red Cross Society',
    vehicleType: 'AMBULANCE',
    phone: '+91 98109 44321',
    status: 'ON_SCENE',
    location: {
      lat: 28.6475,
      lng: 77.2715,
      address: 'Geeta Colony Pushta Point'
    },
    activeMissionId: 'inc-03',
    equipment: ['Mobile Delivery Kit', 'Defibrillator', 'Cold-Chain Insulin & Anti-Venom', 'Oxygen Cylinders x4']
  },
  {
    id: 'resp-04',
    name: 'Civil Defence Quick Response Rider Unit',
    team: 'Delhi Disaster Management Authority',
    vehicleType: 'RAPID_BIKE',
    phone: '+91 98712 99018',
    status: 'AVAILABLE',
    location: {
      lat: 28.6140,
      lng: 77.2850,
      address: 'Mayur Vihar Ext Toll Post'
    },
    equipment: ['Satellite Phone', 'Handheld Megaphone', 'Emergency Medical Supplies']
  }
];

export const INITIAL_INVENTORY: ResourceInventory[] = [
  {
    id: 'inv-01',
    warehouseName: 'Central NGO Depot - Okhla Ph-1',
    location: { lat: 28.5350, lng: 77.2750 },
    category: 'Water & Sanitation',
    itemName: '20L Packaged Mineral Water Cans',
    availableQuantity: 450,
    unit: 'Cans',
    criticalThreshold: 100,
    lastUpdated: '10 mins ago'
  },
  {
    id: 'inv-02',
    warehouseName: 'Central NGO Depot - Okhla Ph-1',
    location: { lat: 28.5350, lng: 77.2750 },
    category: 'Food Supplies',
    itemName: 'Ready-to-Eat Dry Ration Food Packets (3 Days)',
    availableQuantity: 1850,
    unit: 'Packets',
    criticalThreshold: 500,
    lastUpdated: '25 mins ago'
  },
  {
    id: 'inv-03',
    warehouseName: 'Yamuna Sports Complex Logistics Base',
    location: { lat: 28.6530, lng: 77.3040 },
    category: 'Rescue Gear',
    itemName: 'Inflatable Life Jackets (Adult & Child)',
    availableQuantity: 120,
    unit: 'Units',
    criticalThreshold: 50,
    lastUpdated: '1 hour ago'
  },
  {
    id: 'inv-04',
    warehouseName: 'Yamuna Sports Complex Logistics Base',
    location: { lat: 28.6530, lng: 77.3040 },
    category: 'Medical',
    itemName: 'Emergency First Aid & ORS Replenishment Kits',
    availableQuantity: 340,
    unit: 'Kits',
    criticalThreshold: 80,
    lastUpdated: '30 mins ago'
  },
  {
    id: 'inv-05',
    warehouseName: 'Palam Red Cross Hub',
    location: { lat: 28.5800, lng: 77.0800 },
    category: 'Shelter',
    itemName: 'Waterproof Tarpaulin Tents (6 Person)',
    availableQuantity: 85,
    unit: 'Tents',
    criticalThreshold: 30,
    lastUpdated: '2 hours ago'
  }
];

export const INITIAL_TASKS: VolunteerTask[] = [
  {
    id: 'tsk-01',
    title: 'Unload & Distribute 400 Ration Packets to Evacuees',
    category: 'DISTRIBUTION',
    urgency: 'HIGH',
    locationName: 'Akshardham Flyover Staging Post',
    coordinates: { lat: 28.6180, lng: 77.2790 },
    requiredVolunteers: 12,
    assignedVolunteersCount: 8,
    timeEstimate: '2 Hours',
    description: 'Help unload aid truck from Gurudwara Bangla Sahib and form human chain to distribute food kits and dry clothing to families on the embankment.',
    status: 'IN_PROGRESS'
  },
  {
    id: 'tsk-02',
    title: 'Elderly & Child Patient Registration Desk',
    category: 'CAMP_MGMT',
    urgency: 'MEDIUM',
    locationName: 'Kashmere Gate ISBT Relief Camp',
    coordinates: { lat: 28.6685, lng: 77.2320 },
    requiredVolunteers: 4,
    assignedVolunteersCount: 3,
    timeEstimate: '4 Hours',
    description: 'Assist doctors in recording names, missing family members, and chronic medical needs on digital intake tablet.',
    status: 'OPEN'
  },
  {
    id: 'tsk-03',
    title: 'Guide Evacuation Boats at Landing Point',
    category: 'SEARCH_SUPPORT',
    urgency: 'CRITICAL',
    locationName: 'Geeta Colony Ghat Puliya',
    coordinates: { lat: 28.6470, lng: 77.2720 },
    requiredVolunteers: 6,
    assignedVolunteersCount: 2,
    timeEstimate: '3 Hours',
    description: 'Help NDRF boats safely disembark rescued children, pregnant mothers, and pets. Secure mooring lines.',
    status: 'OPEN'
  }
];

export const INITIAL_DONATIONS: DonationRecord[] = [
  {
    id: 'don-01',
    trackingCode: 'RS-DON-4418',
    donorName: 'Anand Mahindra Humanitarian Trust',
    donorEmail: 'aid-desk@mahindratrust.org',
    type: 'SUPPLIES',
    amountOrQuantity: '100x Clean Water Cans (20L) + 500 ORS Kits',
    itemDescription: 'High-purity sealed water containers and hydration kits',
    qrPayload: 'https://reliefsync.org/track/RS-DON-4418?sig=a9f301d',
    status: 'RECEIVED_AT_CAMP',
    currentLocation: 'Mayur Vihar Ph-1 Camp Warehouse',
    allocatedShelterId: 'shl-03',
    allocatedShelterName: 'Mayur Vihar Ph-1 Secondary School Camp',
    createdAt: '4 hours ago',
    milestones: [
      {
        checkpoint: 'PLEDGED',
        location: 'Donor Portal Online',
        timestamp: 'Today, 08:30 AM',
        verifiedBy: 'System Auto-Pledge'
      },
      {
        checkpoint: 'COLLECTED',
        location: 'Central NGO Depot - Okhla Ph-1',
        timestamp: 'Today, 10:15 AM',
        verifiedBy: 'Officer R. Verma (Badge #DDMA-881)',
        notes: 'Verified packaging and seal integrity.'
      },
      {
        checkpoint: 'IN_TRANSIT',
        location: 'Dispatched via Truck DL-1L-9921',
        timestamp: 'Today, 11:20 AM',
        verifiedBy: 'Logistics Lead Manoj Kumar'
      },
      {
        checkpoint: 'RECEIVED_AT_CAMP',
        location: 'Mayur Vihar Ph-1 School Camp Entrance',
        timestamp: 'Today, 12:45 PM',
        verifiedBy: 'Karan Mehra (Camp Coordinator)',
        notes: 'All 100 cans inspected and received.'
      }
    ]
  },
  {
    id: 'don-02',
    trackingCode: 'RS-DON-4419',
    donorName: 'Dr. Shalini Kapoor',
    type: 'MONETARY',
    amountOrQuantity: '₹25,000 INR',
    itemDescription: 'Direct medical relief fund for infant emergency medicines',
    qrPayload: 'https://reliefsync.org/track/RS-DON-4419?sig=c2e880b',
    status: 'DISTRIBUTED',
    currentLocation: 'Indian Red Cross Mobile Pharmacy Unit',
    allocatedShelterId: 'shl-01',
    allocatedShelterName: 'Kashmere Gate ISBT Relief Camp',
    createdAt: '6 hours ago',
    milestones: [
      {
        checkpoint: 'PLEDGED',
        location: 'Online Payment Gateway',
        timestamp: 'Today, 06:15 AM',
        verifiedBy: 'Razorpay Verified'
      },
      {
        checkpoint: 'COLLECTED',
        location: 'Disaster Relief Treasury Account',
        timestamp: 'Today, 06:16 AM',
        verifiedBy: 'DDMA Accounts Wing'
      },
      {
        checkpoint: 'DISTRIBUTED',
        location: 'Purchased 40 Pediatric Antibiotics & Nebulizers',
        timestamp: 'Today, 09:30 AM',
        verifiedBy: 'Dr. Ramesh Chandra (Camp Doctor)',
        notes: 'Medicines dispensed to 28 infants at Kashmere Gate camp.'
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-01',
    timestamp: '12 mins ago',
    actor: 'System (Gemini 2.5 Flash)',
    action: 'AI_INCIDENT_TRIAGE',
    targetId: 'RS-901',
    details: 'Triaged photo + voice input. Set urgency to CRITICAL, confidence 96%, flagged insulin dependency.',
    ipAddress: '10.0.4.12'
  },
  {
    id: 'log-02',
    timestamp: '8 mins ago',
    actor: 'Dispatcher V. Singh',
    action: 'MISSION_DISPATCHED',
    targetId: 'RS-901',
    details: 'Assigned NDRF Boat Unit 04 to rescue family of 6 at Yamuna Bazaar.',
    ipAddress: '192.168.1.104'
  },
  {
    id: 'log-03',
    timestamp: '25 mins ago',
    actor: 'Camp Lead K. Mehra',
    action: 'QR_CHECKPOINT_CONFIRMED',
    targetId: 'RS-DON-4418',
    details: 'Scanned QR code and took custody of 100 water cans at Mayur Vihar camp.',
    ipAddress: '49.36.112.4'
  },
  {
    id: 'log-04',
    timestamp: '35 mins ago',
    actor: 'Admin S. Sharma',
    action: 'RED_ALERT_BROADCAST',
    targetId: 'alt-01',
    details: 'Broadcasted evacuation warning for Yamuna water level 208.66m to 14,200 active browser sessions.',
    ipAddress: '192.168.1.1'
  }
];
