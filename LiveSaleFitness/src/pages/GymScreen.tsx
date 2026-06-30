import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
  ScrollView,
  Linking,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { gymService } from '../services/Gym';

interface Gym {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  address: string;
  lat: number;
  lng: number;
  images: string[];
  distance: string;
  status: string;
  closesAt: string;
  reviewSnippet: string;
  phone?: string;
  services?: any[];
  heroImage?: string;
  galleryImages?: string[];
  offers?: any[];
  freeTrial?: any;
  description?: string;
}

const categories = ['Relevance ▾', 'Open now', 'Top-rated', '100+ reviews'];

interface GymScreenProps {
  isDarkMode: boolean;
  onGymSelect?: (id: string) => void;
}

const GymScreen: React.FC<GymScreenProps> = ({ isDarkMode, onGymSelect }) => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Open now');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 19.0760, lng: 72.8777 }); // Default Mumbai
  const [sheetIndex, setSheetIndex] = useState(0); // Track snap index (0: 15%, 1: 50%, 2: 90%)
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<'Overview' | 'Services' | 'Reviews' | 'Photos' | 'Updates'>('Overview');

  const WebViewComponent = WebView as any;
  const webViewRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? '#161A22' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    accent: isDarkMode ? '#A3E635' : '#EAB308',
    pillBg: isDarkMode ? '#242C3D' : '#E5E7EB',
    btnBg: isDarkMode ? '#242C3D' : '#F3F4F6',
  };

  useEffect(() => {
    const fetchLocationAndGyms = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'App needs access to your location to show nearby gyms.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            loadNearbyGyms(19.0760, 72.8777);
            return;
          }
        }

        Geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            loadNearbyGyms(latitude, longitude);
          },
          (error) => {
            console.warn('Geolocation error, fallback to default:', error);
            loadNearbyGyms(19.0760, 72.8777);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      } catch (err) {
        console.warn(err);
        loadNearbyGyms(19.0760, 72.8777);
      }
    };

    fetchLocationAndGyms();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (isDetailMode) {
        setIsDetailMode(false);
        bottomSheetRef.current?.snapToIndex(1);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isDetailMode]);

  const loadNearbyGyms = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await gymService.getNearbyGyms({ lat, lng, radius: 15 });
      const apiGyms = response.data || response || [];

      if (Array.isArray(apiGyms) && apiGyms.length > 0) {
        const mappedGyms: Gym[] = apiGyms.map((g: any, index: number) => {
          const combinedImages: string[] = [];
          if (g.heroImage) combinedImages.push(g.heroImage);
          if (Array.isArray(g.images)) {
            g.images.forEach((img: string) => {
              if (img && !combinedImages.includes(img)) combinedImages.push(img);
            });
          }
          if (Array.isArray(g.galleryImages)) {
            g.galleryImages.forEach((img: string) => {
              if (img && !combinedImages.includes(img)) combinedImages.push(img);
            });
          }
          if (combinedImages.length === 0) {
            combinedImages.push(
              'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300',
              'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=300',
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=300'
            );
          }
          return {
            id: g._id || String(index + 1),
            name: g.name || 'Premium Gym',
            rating: g.rating?.average || 4.5,
            reviewsCount: g.rating?.count || 45,
            address: g.location?.address || g.location?.city || 'Nearby',
            lat: g.location?.latitude || g.locationPoint?.coordinates?.[1] || lat,
            lng: g.location?.longitude || g.locationPoint?.coordinates?.[0] || lng,
            images: combinedImages,
            distance: g.distanceKm ? `${g.distanceKm} km` : '160 m',
            status: g.active ? 'Open' : 'Closed',
            closesAt: '10:30 pm',
            reviewSnippet: 'Knowledgeable trainers, spotless gym, and great equipment!',
            phone: g.phone || '+91 98765 43210',
            services: g.services || [],
            heroImage: g.heroImage,
            galleryImages: g.galleryImages || [],
            offers: g.offers || [],
            freeTrial: g.freeTrial,
            description: g.description
          };
        });
        setGyms(mappedGyms);
        if (mappedGyms.length > 0) {
          setSelectedGym(mappedGyms[0]);
        }
      } else {
        const mockGyms: Gym[] = [
          {
            id: '1',
            name: 'B2B Fitness',
            rating: 5.0,
            reviewsCount: 145,
            address: 'Ravet, Pune',
            lat: lat + 0.003,
            lng: lng + 0.002,
            images: [
              'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300',
              'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=300',
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=300'
            ],
            distance: '160.0 m',
            status: 'Open',
            closesAt: '10:30 pm',
            reviewSnippet: 'Knowledgeable trainers, spotless gym, and great equipment!',
            phone: '+91 90876 54321'
          },
          {
            id: '2',
            name: 'Multifit Pradhikaran',
            rating: 4.2,
            reviewsCount: 550,
            address: 'Pradhikaran, Pune',
            lat: lat - 0.004,
            lng: lng - 0.005,
            images: [
              'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=300',
              'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=300',
              'https://images.unsplash.com/photo-1605296867304-46d5465a25f1?q=80&w=300'
            ],
            distance: '230.0 m',
            status: 'Open',
            closesAt: '10:30 pm',
            reviewSnippet: 'Clean, modern gym featuring trainers and a swimming pool.',
            phone: '+91 91234 56789'
          },
          {
            id: '3',
            name: 'Gold\'s Gym',
            rating: 4.6,
            reviewsCount: 220,
            address: 'Akurdi, Pune',
            lat: lat + 0.006,
            lng: lng - 0.004,
            images: [
              'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=300',
              'https://images.unsplash.com/photo-1570829460005-c840387bb1ca?q=80&w=300',
              'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=300'
            ],
            distance: '1.2 km',
            status: 'Open',
            closesAt: '10:00 pm',
            reviewSnippet: 'Brilliant equipment, huge area and friendly staff guides.',
            phone: '+91 99988 77766'
          }
        ];
        setGyms(mockGyms);
        setSelectedGym(mockGyms[0]);
      }
    } catch (error) {
      console.warn('API error loading gyms, fallback to mock:', error);
      const mockGyms: Gym[] = [
        {
          id: '1',
          name: 'B2B Fitness',
          rating: 5.0,
          reviewsCount: 145,
          address: 'Ravet, Pune',
          lat: lat + 0.003,
          lng: lng + 0.002,
          images: [
            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300',
            'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=300',
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=300'
          ],
          distance: '160.0 m',
          status: 'Open',
          closesAt: '10:30 pm',
          reviewSnippet: 'Knowledgeable trainers, spotless gym, and great equipment!',
          phone: '+91 90876 54321'
        },
        {
          id: '2',
          name: 'Multifit Pradhikaran',
          rating: 4.2,
          reviewsCount: 550,
          address: 'Pradhikaran, Pune',
          lat: lat - 0.004,
          lng: lng - 0.005,
          images: [
            'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=300',
            'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=300',
            'https://images.unsplash.com/photo-1605296867304-46d5465a25f1?q=80&w=300'
          ],
          distance: '230.0 m',
          status: 'Open',
          closesAt: '10:30 pm',
          reviewSnippet: 'Clean, modern gym featuring trainers and a swimming pool.',
          phone: '+91 91234 56789'
        }
      ];
      setGyms(mockGyms);
      setSelectedGym(mockGyms[0]);
    } finally {
      setLoading(false);
    }
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
        body { background-color: ${isDarkMode ? '#0D0E12' : '#F1F2F4'}; }
        .maplibregl-ctrl-attrib { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var style = {
          "version": 8,
          "sources": {
            "osm-tiles": {
              "type": "raster",
              "tiles": [
                "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
              ],
              "tileSize": 256
            }
          },
          "layers": [
            {
              "id": "osm-layer",
              "type": "raster",
              "source": "osm-tiles",
              "minzoom": 0,
              "maxzoom": 19
            }
          ]
        };

        var map = new maplibregl.Map({
          container: 'map',
          style: style,
          center: [${userLocation.lng}, ${userLocation.lat}],
          zoom: 13,
          attributionControl: false
        });

        // User location pin
        var userEl = document.createElement('div');
        userEl.style.backgroundColor = '#3B82F6';
        userEl.style.width = '14px';
        userEl.style.height = '14px';
        userEl.style.borderRadius = '50%';
        userEl.style.border = '3px solid #FFF';
        userEl.style.boxShadow = '0 0 12px #3B82F6';
        
        new maplibregl.Marker(userEl)
          .setLngLat([${userLocation.lng}, ${userLocation.lat}])
          .addTo(map);

        var markers = {};
        var gyms = ${JSON.stringify(gyms)};

        gyms.forEach(function(gym) {
          var el = document.createElement('div');
          el.style.backgroundColor = '#EF4444';
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.borderRadius = '50%';
          el.style.border = '4px solid rgba(239, 68, 68, 0.4)';
          el.style.boxShadow = '0 0 8px rgba(239,68,68,0.7)';
          el.style.cursor = 'pointer';
          
          var marker = new maplibregl.Marker(el)
            .setLngLat([gym.lng, gym.lat])
            .addTo(map);
            
          el.addEventListener('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MARKER_CLICK',
              id: gym.id
            }));
          });
          
          markers[gym.id] = { marker: marker, element: el };
        });

        window.addEventListener('message', function(event) {
          var data = JSON.parse(event.data);
          if (data.type === 'SELECT_GYM') {
            map.easeTo({ center: [data.lng, data.lat], zoom: 14 });
            for (var key in markers) {
              if (key === data.id) {
                markers[key].element.style.backgroundColor = '${isDarkMode ? '#A3E635' : '#EAB308'}';
                markers[key].element.style.borderColor = 'rgba(163, 230, 53, 0.4)';
              } else {
                markers[key].element.style.backgroundColor = '#EF4444';
                markers[key].element.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }
            }
          } else if (data.type === 'RECENTER') {
            map.easeTo({ center: [data.lng, data.lat], zoom: 14 });
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleGymSelect = (gym: Gym) => {
    setSelectedGym(gym);
    setIsDetailMode(true);
    const message = JSON.stringify({
      type: 'SELECT_GYM',
      id: gym.id,
      lat: gym.lat,
      lng: gym.lng,
    });
    webViewRef.current?.postMessage(message);

    // Snaps to 90% height (index 2) to show the detailed view
    bottomSheetRef.current?.snapToIndex(2);
  };

  const handleRecenter = () => {
    const targetLat = selectedGym ? selectedGym.lat : userLocation.lat;
    const targetLng = selectedGym ? selectedGym.lng : userLocation.lng;
    const message = JSON.stringify({
      type: 'RECENTER',
      lat: targetLat,
      lng: targetLng,
    });
    webViewRef.current?.postMessage(message);
  };

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MARKER_CLICK') {
        const found = gyms.find((g) => g.id === data.id);
        if (found) {
          setSelectedGym(found);
          setIsDetailMode(true);
          // Snap sheet to 90% (index 2) on marker tap
          bottomSheetRef.current?.snapToIndex(2);
        }
      }
    } catch (e) {
      console.log('Error parsing WebView message', e);
    }
  };

  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  const getFabBottom = () => {
    const screenHeight = Dimensions.get('window').height;
    // Calculate fab bottom position relative to the current bottom sheet index
    if (sheetIndex === 0) {
      return 150; // 15% height snap position
    }
    if (sheetIndex === 1) {
      return screenHeight * 0.5 + 14; // 50% height snap position
    }
    return screenHeight * 0.9 + 14; // 90% height snap position
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Full screen Map WebView */}
        <View style={styles.mapFrame}>
          {loading ? (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.bg }]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Fetching gyms within 15 km...</Text>
            </View>
          ) : (
            <WebViewComponent
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={onMessage}
            />
          )}

          {/* Floating Search Bar */}
          <View style={styles.floatingHeader}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                placeholder="near gym me"
                placeholderTextColor={colors.subText}
                style={[styles.searchInput, { color: colors.text }]}
              />
              <Text style={styles.clearIcon}>✕</Text>
            </View>
          </View>

          {/* Floating Action Buttons (Right side overlay) */}
          <View style={[styles.fabContainer, { bottom: getFabBottom() }]}>
            <TouchableOpacity
              onPress={handleRecenter}
              style={[styles.fabButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18 }}>🧭</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabButton, styles.directionsButton]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 20, color: '#FFFFFF' }}>↗️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Half: Google Maps Search Results Bottom Sheet using @gorhom/bottom-sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0} // Init to 15% snap (index 0)
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          backgroundStyle={{ backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border }}
          handleIndicatorStyle={{ backgroundColor: 'rgba(100, 116, 139, 0.4)', width: 40, height: 4 }}
        >
          <View style={styles.sheetContent}>
            {isDetailMode && selectedGym ? (
              <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailScrollContent}
              >
                {/* Header Row */}
                <View style={styles.detailHeaderRow}>
                  <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>{selectedGym.name}</Text>
                  <View style={styles.detailHeaderButtons}>
                    <TouchableOpacity style={[styles.detailHeaderBtn, { backgroundColor: colors.pillBg }]}>
                      <Text style={{ fontSize: 14 }}>🔖</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.detailHeaderBtn, { backgroundColor: colors.pillBg }]}>
                      <Text style={{ fontSize: 14 }}>🔗</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.detailHeaderBtn, { backgroundColor: colors.pillBg }]}
                      onPress={() => { setIsDetailMode(false); bottomSheetRef.current?.snapToIndex(1); }}
                    >
                      <Text style={[styles.closeBtnText, { color: colors.text }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Meta details */}
                <View style={styles.detailMetaRow}>
                  <Text style={[styles.detailRating, { color: colors.text }]}>{selectedGym.rating.toFixed(1)}</Text>
                  <Text style={{ color: '#EAB308', marginHorizontal: 2 }}>★★★★★</Text>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>({selectedGym.reviewsCount}) · 🚗 1 min</Text>
                </View>
                <Text style={[styles.detailCategory, { color: colors.subText }]}>Gym</Text>
                <Text style={styles.detailOpenStatus}>
                  Open<Text style={{ color: colors.subText }}> · Closes {selectedGym.closesAt}</Text>
                </Text>
                <Text style={{ fontSize: 13, color: colors.subText, marginTop: 4, lineHeight: 18 ,paddingBottom:15,}} numberOfLines={2}>
                  📍 {selectedGym.address}
                </Text>

                {/* Quick actions row */}
                {/* Quick actions row */}
                <View style={styles.detailActionsRow}>
                  <TouchableOpacity style={[styles.detailActionPrimary, { backgroundColor: '#0D9488', flex: 0.46 }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginRight: 4 }}>↗️</Text>
                    <Text style={styles.detailActionPrimaryText}>Directions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailActionSecondary, { backgroundColor: colors.pillBg, flex: 0.25 }]}
                    onPress={() => onGymSelect?.(selectedGym.id)}
                  >
                    <Text style={{ fontSize: 12, marginRight: 4 }}>👁️</Text>
                    <Text style={[styles.detailActionSecondaryText, { color: colors.text }]} numberOfLines={1}>View Gym</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailActionSecondary, { backgroundColor: colors.pillBg, flex: 0.25 }]}
                    onPress={() => {
                      if (selectedGym.phone) {
                        Linking.openURL(`tel:${selectedGym.phone}`);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 12, marginRight: 4 }}>📞</Text>
                    <Text style={[styles.detailActionSecondaryText, { color: colors.text }]}>Call</Text>
                  </TouchableOpacity>
                </View>

                {/* Photos Grid */}
                <View style={styles.photoGridContainer}>
                  <Image
                    source={{ uri: selectedGym.images?.[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300' }}
                    style={styles.gridImageLarge}
                  />
                  <View style={styles.gridImageRightColumn}>
                    <Image
                      source={{ uri: selectedGym.images?.[1] || selectedGym.images?.[0] || 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=300' }}
                      style={styles.gridImageSmall}
                    />
                    <Image
                      source={{ uri: selectedGym.images?.[2] || selectedGym.images?.[0] || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=300' }}
                      style={styles.gridImageSmall}
                    />
                  </View>
                </View>

                {/* Tabs Row */}
                <View style={[styles.tabsContainer, { borderColor: colors.border }]}>
                  {['Overview', 'Services', 'Reviews', 'Photos', 'Updates'].map((tab) => {
                    const isActive = detailActiveTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        style={[isActive ? styles.tabItemActive : styles.tabItem, isActive && { borderBottomColor: colors.accent }]}
                        onPress={() => setDetailActiveTab(tab as any)}
                      >
                        <Text style={[isActive ? styles.tabTextActive : styles.tabText, { color: isActive ? colors.accent : colors.subText }]}>{tab}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Conditional Tab Content */}
                {detailActiveTab === 'Overview' && (
                  <View style={styles.overviewSection}>
                    {/* Free Trial Banner */}
                    {selectedGym.freeTrial && selectedGym.freeTrial.available ? (
                      <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#22C55E', borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: colors.pillBg }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 20, marginRight: 8 }}>🎁</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#22C55E', fontWeight: 'bold', fontSize: 13 }}>Free Trial Available!</Text>
                            <Text style={{ color: colors.text, fontSize: 11, marginTop: 2 }}>
                              {selectedGym.freeTrial.days ? `${selectedGym.freeTrial.days}-Day Pass: ` : ''}
                              {selectedGym.freeTrial.description || 'Get free trial access to explore the gym equipment.'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {/* Offers List */}
                    {selectedGym.offers && selectedGym.offers.length > 0 ? (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 }}>🏷️ Exclusive Offers</Text>
                        {selectedGym.offers.map((offer: any, idx: number) => (
                          <View key={idx} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: colors.pillBg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                              <Text style={{ fontSize: 16, marginRight: 8, marginTop: 1 }}>🏷️</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>{offer.title}</Text>
                                {offer.description ? <Text style={{ fontSize: 11, color: colors.subText, marginTop: 2 }}>{offer.description}</Text> : null}
                                {offer.expiryDate ? <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: 'bold', marginTop: 4 }}>Expires: {offer.expiryDate}</Text> : null}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* About description */}
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8, marginTop: 12 }}>About Gym</Text>
                    <Text style={{ fontSize: 13, lineHeight: 18, color: colors.subText, marginBottom: 16 }}>
                      {selectedGym.description || 'Welcome to ' + selectedGym.name + '. We offer high-quality cardio machines, strength training equipment, and premium certified trainers to help you achieve your ultimate fitness goals.'}
                    </Text>

                    <View style={styles.knowBeforeHeader}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>💡</Text>
                      <Text style={[styles.knowBeforeTitle, { color: colors.text }]}>Know before you go</Text>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>New!</Text>
                      </View>
                    </View>

                    <View style={styles.bulletsContainer}>
                      <View style={styles.bulletRow}>
                        <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
                        <Text style={[styles.bulletText, { color: colors.text }]}>
                          Reviewers highlight that the staff is supportive and the facility is kept very clean
                        </Text>
                      </View>
                      <View style={styles.bulletRow}>
                        <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
                        <Text style={[styles.bulletText, { color: colors.text }]}>
                          Reviewers suggest it is a competitive budget-friendly option for those seeking affordable memberships
                        </Text>
                      </View>
                      <View style={styles.bulletRow}>
                        <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
                        <Text style={[styles.bulletText, { color: colors.text }]}>
                          Reviewers mention it can get busy during peak hours - plan your visit accordingly
                        </Text>
                      </View>
                    </View>

                    {/* Ask maps and cert buttons */}
                    <View style={styles.subActionRow}>
                      <TouchableOpacity style={[styles.subActionButton, { backgroundColor: colors.pillBg }]}>
                        <Text style={[styles.subActionText, { color: colors.text }]}>🔍 Ask Maps</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.subActionButton, { backgroundColor: colors.pillBg }]}>
                        <Text style={[styles.subActionText, { color: colors.text }]}>↪️ Are the trainers certified?</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Related to your search (Other Gyms from Database) */}
                    <Text style={[styles.relatedTitle, { color: colors.text, marginTop: 16 }]}>Related to your search</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 10 }}>
                      {gyms
                        .filter(g => g.id !== selectedGym.id)
                        .map((otherGym) => (
                          <TouchableOpacity 
                            key={otherGym.id} 
                            style={{ 
                              width: 160, 
                              backgroundColor: colors.pillBg, 
                              borderRadius: 16, 
                              padding: 10, 
                              marginRight: 12, 
                              borderWidth: 1, 
                              borderColor: colors.border,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.05,
                              shadowRadius: 4,
                              elevation: 2,
                            }}
                            onPress={() => handleGymSelect(otherGym)}
                          >
                            <Image 
                              source={{ uri: otherGym.images?.[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200' }} 
                              style={{ width: '100%', height: 95, borderRadius: 12, marginBottom: 8, resizeMode: 'cover' }} 
                            />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4 }} numberOfLines={1}>
                              {otherGym.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 11, color: '#EAB308', marginRight: 2 }}>★</Text>
                                <Text style={{ fontSize: 11, color: colors.text, fontWeight: '700' }}>
                                  {otherGym.rating.toFixed(1)}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10, color: colors.subText, fontWeight: '600' }} numberOfLines={1}>
                                📍 {otherGym.distance}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}

                {detailActiveTab === 'Services' && (
                  <View style={styles.overviewSection}>
                    <Text style={[styles.relatedTitle, { color: colors.text, marginBottom: 12 }]}>Gym Services & Plans</Text>
                    {selectedGym.services && selectedGym.services.length > 0 ? (
                      selectedGym.services.map((srv: any, index: number) => (
                        <View key={srv._id || index} style={{ backgroundColor: colors.pillBg, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>{srv.name}</Text>
                          <Text style={{ color: colors.subText, fontSize: 12, marginTop: 4 }}>{srv.description}</Text>
                        </View>
                      ))
                    ) : (
                      <>
                        <View style={{ backgroundColor: colors.pillBg, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Monthly Membership</Text>
                          <Text style={{ color: colors.subText, fontSize: 12, marginTop: 4 }}>Access to standard cardio and strength equipment area.</Text>
                          <Text style={{ color: colors.accent, fontWeight: '900', marginTop: 8 }}>₹1,999/month</Text>
                        </View>
                        <View style={{ backgroundColor: colors.pillBg, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Personal Trainer Sessions</Text>
                          <Text style={{ color: colors.subText, fontSize: 12, marginTop: 4 }}>1-on-1 personalized guidance with a certified expert.</Text>
                          <Text style={{ color: colors.accent, fontWeight: '900', marginTop: 8 }}>₹500/session</Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {detailActiveTab === 'Reviews' && (
                  <View style={styles.overviewSection}>
                    <Text style={[styles.relatedTitle, { color: colors.text, marginBottom: 12 }]}>Reviews Summary</Text>
                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.userAvatar, { backgroundColor: colors.pillBg }]}>
                        <Text style={{ fontSize: 10 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Adil Patel</Text>
                        <Text style={{ color: '#EAB308', fontSize: 10, marginVertical: 2 }}>★★★★★</Text>
                        <Text style={{ color: colors.subText, fontSize: 12 }}>"Best equipment, huge workout area, and very helpful staff guides."</Text>
                      </View>
                    </View>
                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.userAvatar, { backgroundColor: colors.pillBg }]}>
                        <Text style={{ fontSize: 10 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Rahul Sharma</Text>
                        <Text style={{ color: '#EAB308', fontSize: 10, marginVertical: 2 }}>★★★★☆</Text>
                        <Text style={{ color: colors.subText, fontSize: 12 }}>"Overall a great facility with very clean environment and standard amenities."</Text>
                      </View>
                    </View>
                  </View>
                )}

                {detailActiveTab === 'Photos' && (() => {
                  const allPhotos: string[] = [];
                  if (selectedGym.heroImage) allPhotos.push(selectedGym.heroImage);
                  if (selectedGym.images) {
                    selectedGym.images.forEach(img => {
                      if (img && !allPhotos.includes(img)) allPhotos.push(img);
                    });
                  }
                  if (selectedGym.galleryImages) {
                    selectedGym.galleryImages.forEach(img => {
                      if (img && !allPhotos.includes(img)) allPhotos.push(img);
                    });
                  }
                  if (allPhotos.length === 0) {
                    allPhotos.push('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300');
                  }
                  return (
                    <View style={styles.overviewSection}>
                      <Text style={[styles.relatedTitle, { color: colors.text, marginBottom: 12 }]}>Photos Gallery</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {allPhotos.map((imgUrl, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: imgUrl }}
                            style={{ width: '48%', height: 110, borderRadius: 8, marginBottom: 10 }}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })()}

                {detailActiveTab === 'Updates' && (
                  <View style={styles.overviewSection}>
                    <Text style={[styles.relatedTitle, { color: colors.text, marginBottom: 8 }]}>Latest Updates</Text>
                    <Text style={{ color: colors.subText, fontSize: 12, fontStyle: 'italic' }}>
                      No recent updates posted by this gym.
                    </Text>
                  </View>
                )}
              </BottomSheetScrollView>
            ) : (
              <>
                {/* Title & Close */}
                <View style={[styles.sheetHeader, { paddingHorizontal: 16 }]}>
                  <TouchableOpacity onPress={() => bottomSheetRef.current?.snapToIndex(sheetIndex === 2 ? 0 : 2)} activeOpacity={0.8}>
                    <Text style={[styles.sheetTitle, { color: colors.text }]}>near gym me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => bottomSheetRef.current?.snapToIndex(0)}
                  >
                    <Text style={[styles.closeBtnText, { color: colors.text }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Filter Pills */}
                <View style={[styles.filtersWrapper, { paddingHorizontal: 16 }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    <TouchableOpacity style={[styles.filterPill, { backgroundColor: colors.pillBg }]}>
                      <Text style={{ fontSize: 12, color: colors.text }}>🎛️</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: cat === selectedCategory ? colors.accent : colors.pillBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            {
                              color: cat === selectedCategory ? '#0D0E12' : colors.text,
                              fontWeight: cat === selectedCategory ? '700' : '500',
                            },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Gym Cards Scroll List using BottomSheetScrollView to prevent scroll conflicts */}
                <BottomSheetScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.gymListContent}
                >
                  {gyms.map((gym) => {
                    const isSelected = selectedGym?.id === gym.id;
                    return (
                      <TouchableOpacity
                        key={gym.id}
                        style={[
                          styles.gymItemCard,
                          { borderColor: colors.border },
                          isSelected && { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
                        ]}
                        activeOpacity={0.9}
                        onPress={() => handleGymSelect(gym)}
                      >
                        {/* Gym Info Header */}
                        <Text style={[styles.gymNameText, { color: colors.text }]}>{gym.name}</Text>

                        <View style={styles.gymMetaRow}>
                          <Text style={[styles.gymRatingText, { color: colors.text }]}>{gym.rating.toFixed(1)}</Text>
                          <Text style={styles.starIcon}>⭐</Text>
                          <Text style={[styles.gymReviewsCount, { color: colors.subText }]}>({gym.reviewsCount})</Text>
                          <Text style={[styles.gymDotSeparator, { color: colors.subText }]}>•</Text>
                          <Text style={[styles.gymCategoryText, { color: colors.subText }]}>Gym</Text>
                          <Text style={[styles.gymDotSeparator, { color: colors.subText }]}>•</Text>
                          <Text style={[styles.gymDistanceText, { color: colors.subText }]}>{gym.distance}</Text>
                        </View>

                        {/* Open Status & Closing */}
                        <View style={styles.statusRow}>
                          <Text style={styles.openStatusText}>{gym.status}</Text>
                          <Text style={[styles.closesAtText, { color: colors.subText }]}> • Closes {gym.closesAt}</Text>
                        </View>

                        {/* Horizontal Photo Gallery (3 Photos) */}
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.galleryScroll}
                          contentContainerStyle={styles.galleryContent}
                        >
                          {gym.images.map((imgUrl, idx) => (
                            <Image key={idx} source={{ uri: imgUrl }} style={styles.galleryImage} />
                          ))}
                        </ScrollView>

                        {/* Review Quote Snippet */}
                        <View style={styles.reviewSnippetContainer}>
                          <View style={[styles.userAvatar, { backgroundColor: colors.pillBg }]}>
                            <Text style={[styles.avatarIconText, { color: colors.subText }]}>👤</Text>
                          </View>
                          <Text style={[styles.snippetText, { color: colors.subText }]} numberOfLines={1}>
                            "{gym.reviewSnippet}"
                          </Text>
                        </View>

                        {/* Action Row buttons */}
                        <View style={styles.actionBtnRow}>
                          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]} activeOpacity={0.8}>
                            <Text style={styles.actionIcon}>🧭</Text>
                            <Text style={[styles.actionBtnText, { color: colors.text }]}>Directions</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (gym.phone) {
                                Linking.openURL(`tel:${gym.phone}`);
                              }
                            }}
                          >
                            <Text style={styles.actionIcon}>📞</Text>
                            <Text style={[styles.actionBtnText, { color: colors.text }]}>Call</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]} activeOpacity={0.8}>
                            <Text style={styles.actionIcon}>🔗</Text>
                            <Text style={[styles.actionBtnText, { color: colors.text }]}>Share</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </BottomSheetScrollView>
              </>
            )}
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 15,
    marginHorizontal: 4,
  },
  fabContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 25,
  },
  fabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  directionsButton: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  sheetContent: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filtersWrapper: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
    fontSize: 12,
  },
  gymListContent: {
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  gymItemCard: {
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  gymNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  gymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gymRatingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  starIcon: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  gymReviewsCount: {
    fontSize: 12,
  },
  gymDotSeparator: {
    fontSize: 12,
    marginHorizontal: 5,
  },
  gymCategoryText: {
    fontSize: 12,
  },
  gymDistanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  openStatusText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  closesAtText: {
    fontSize: 12,
  },
  galleryScroll: {
    marginTop: 10,
  },
  galleryContent: {
    paddingRight: 10,
  },
  galleryImage: {
    width: 110,
    height: 80,
    borderRadius: 8,
    marginRight: 6,
  },
  reviewSnippetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarIconText: {
    fontSize: 10,
  },
  snippetText: {
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    flex: 1,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailScrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
  },
  detailHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailRating: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailCategory: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailOpenStatus: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 16,
  },
  detailActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.38,
    justifyContent: 'center',
  },
  detailActionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  detailActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.18,
    justifyContent: 'center',
  },
  detailActionSecondaryText: {
    fontWeight: '600',
    fontSize: 12,
  },
  photoGridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridImageLarge: {
    width: '58%',
    height: 190,
    borderRadius: 16,
  },
  gridImageRightColumn: {
    width: '39%',
    justifyContent: 'space-between',
  },
  gridImageSmall: {
    width: '100%',
    height: 91,
    borderRadius: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItemActive: {
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2.5,
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 20,
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  overviewSection: {
    paddingTop: 4,
  },
  knowBeforeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  knowBeforeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  newBadge: {
    backgroundColor: '#86EFAC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  newBadgeText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800',
  },
  bulletsContainer: {
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 14,
    marginRight: 8,
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  subActionRow: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  subActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 8,
  },
  subActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  relatedReviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  relatedReviewText: {
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default GymScreen;
