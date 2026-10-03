import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/property.dart';

class PropertyDetailScreen extends StatefulWidget {
  final Property property;

  const PropertyDetailScreen({super.key, required this.property});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> {
  int _currentImageIndex = 0;
  bool _isSaved = false;
  bool _isSaving = false;
  final PageController _pageController = PageController();

  @override
  void initState() {
    super.initState();
    _checkIfSaved();
  }

  Future<void> _checkIfSaved() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('saved')
          .doc(widget.property.id)
          .get();
      if (mounted) {
        setState(() {
          _isSaved = doc.exists;
        });
      }
    } catch (e) {
      debugPrint('Error checking saved state: $e');
    }
  }

  Future<void> _toggleSaveProperty() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please log in with your account to save properties in Shillong'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    final savedRef = FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('saved')
        .doc(widget.property.id);

    try {
      if (_isSaved) {
        await savedRef.delete();
        if (mounted) {
          setState(() {
            _isSaved = false;
            _isSaving = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Removed from saved properties'),
              behavior: SnackBarBehavior.floating,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        await savedRef.set({
          'propertyId': widget.property.id,
          'title': widget.property.title,
          'price': widget.property.price,
          'locality': widget.property.address,
          'savedAt': FieldValue.serverTimestamp(),
        });
        if (mounted) {
          setState(() {
            _isSaved = true;
            _isSaving = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Saved to your hill favourites!'),
              behavior: SnackBarBehavior.floating,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not update saved list: $e')),
        );
      }
    }
  }

  Future<void> _callOwner() async {
    final cleanPhone = widget.property.phone.replaceAll(RegExp(r'\s+'), '');
    final uri = Uri.parse('tel:$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not dial $cleanPhone')),
        );
      }
    }
  }

  Future<void> _chatWhatsApp() async {
    final phone = widget.property.phone.replaceAll(RegExp(r'[^0-9]'), '');
    final text = Uri.encodeComponent(
      'Kublei! I saw your listing "${widget.property.title}" in ${widget.property.address} on Ha la Ri. Is it still available?',
    );
    final uri = Uri.parse('https://wa.me/$phone?text=$text');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  String _formatPrice(double price, String type) {
    if (type.toLowerCase() == 'rent') {
      return '₹${price.toStringAsFixed(0)} /month';
    }
    if (price >= 10000000) {
      return '₹${(price / 10000000).toStringAsFixed(2)} Cr';
    }
    return '₹${(price / 100000).toStringAsFixed(1)} Lakhs';
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.property;
    final images = p.images.isNotEmpty
        ? p.images
        : ['https://picsum.photos/800/600'];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text(
          p.title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
                    _isSaved ? Icons.bookmark : Icons.bookmark_border,
                    color: _isSaved ? const Color(0xFFE63946) : Colors.black87,
                  ),
            tooltip: _isSaved ? 'Remove from saved' : 'Save property',
            onPressed: _toggleSaveProperty,
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            tooltip: 'Share listing link',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Direct link to "${p.title}" copied! Share with friends or family.'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Carousel with Page Indicator
            Stack(
              alignment: Alignment.bottomCenter,
              children: [
                SizedBox(
                  height: 280,
                  width: double.infinity,
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: images.length,
                    onPageChanged: (index) {
                      setState(() => _currentImageIndex = index);
                    },
                    itemBuilder: (context, index) {
                      return Image.network(
                        images[index],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          color: const Color(0xFF1B3524),
                          child: const Center(
                            child: Icon(Icons.home, color: Colors.white54, size: 64),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                // Indicators & Counter
                Positioned(
                  bottom: 12,
                  left: 16,
                  right: 16,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Dots
                      Row(
                        children: List.generate(
                          images.length,
                          (idx) => Container(
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: _currentImageIndex == idx ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: _currentImageIndex == idx
                                  ? Colors.white
                                  : Colors.white54,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      ),
                      // Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.65),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${_currentImageIndex + 1} / ${images.length}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Content Body
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type and Verification row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7A9E7E).withOpacity(0.18),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          p.type.toUpperCase() == 'RENT'
                              ? 'FOR RENT'
                              : 'FOR SALE',
                          style: const TextStyle(
                            color: Color(0xFF1B3524),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (p.isVerified)
                        const Row(
                          children: [
                            Icon(Icons.verified,
                                color: Color(0xFF2A9D8F), size: 18),
                            SizedBox(width: 4),
                            Text(
                              'Verified Hill Home',
                              style: TextStyle(
                                color: Color(0xFF2A9D8F),
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Price
                  Text(
                    _formatPrice(p.price, p.type),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1B3524),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Title
                  Text(
                    p.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Address
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on,
                          color: Color(0xFF7A9E7E), size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          p.address,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade700,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Key Specs Grid: BHK, Type, Verified
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _specTile(
                          icon: Icons.bedroom_parent_outlined,
                          title: 'Bedrooms',
                          value: p.bhk == 0 ? 'Studio' : '${p.bhk} BHK',
                        ),
                        Container(
                          width: 1,
                          height: 36,
                          color: Colors.grey.shade200,
                        ),
                        _specTile(
                          icon: Icons.home_work_outlined,
                          title: 'Category',
                          value: p.type.toUpperCase(),
                        ),
                        Container(
                          width: 1,
                          height: 36,
                          color: Colors.grey.shade200,
                        ),
                        _specTile(
                          icon: Icons.terrain_outlined,
                          title: 'Region',
                          value: 'Shillong Hills',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Shillong Hill Water & Road Highlights
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F1EB),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'HILL AMENITIES & ROAD ACCESS',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1B3524),
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.water_drop,
                                color: Color(0xFF1D3557), size: 16),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '24/7 Water Supply & Dedicated Gravity Reservoir',
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey.shade800),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.directions_car,
                                color: Color(0xFF386641), size: 16),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Motorable car touch road with hillside parking',
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey.shade800),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Owner Contact Card
                  const Text(
                    'PROPERTY OWNER',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: const Color(0xFF7A9E7E),
                          child: Text(
                            p.ownerName.isNotEmpty
                                ? p.ownerName[0].toUpperCase()
                                : 'O',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.ownerName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                p.phone,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chat_bubble_outline,
                              color: Color(0xFF25D366)),
                          tooltip: 'WhatsApp',
                          onPressed: _chatWhatsApp,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 90), // Bottom padding for sticky action bar
                ],
              ),
            ),
          ],
        ),
      ),

      // Sticky Bottom Call & Save Action Bar
      bottomSheet: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              // Save Button
              OutlinedButton.icon(
                onPressed: _toggleSaveProperty,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: BorderSide(
                    color: _isSaved ? const Color(0xFFE63946) : Colors.grey.shade300,
                  ),
                ),
                icon: Icon(
                  _isSaved ? Icons.bookmark : Icons.bookmark_border,
                  color: _isSaved ? const Color(0xFFE63946) : Colors.black87,
                ),
                label: Text(
                  _isSaved ? 'Saved' : 'Save',
                  style: TextStyle(
                    color: _isSaved ? const Color(0xFFE63946) : Colors.black87,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Call Owner Primary Action Button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _callOwner,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1B3524),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.phone, size: 20),
                  label: const Text(
                    'Call Owner',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _specTile({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF7A9E7E)),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}
