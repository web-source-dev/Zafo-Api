const User = require('../models/user');
const Ticket = require('../models/ticket');
const Event = require('../models/event');

/**
 * User Controller
 * Handles user dashboard and profile-related operations
 */
const userController = {
  /**
   * Get comprehensive user dashboard overview
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getDashboardOverview: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Get all tickets for this user with populated event data
      const tickets = await Ticket.find({ attendee: userId })
        .populate('eventId', 'title startDate endDate location category capacity coverImage slug')
        .populate('organizer', 'firstName lastName email')
        .sort({ purchasedAt: -1 });
      
      // Calculate ticket statistics based on actual quantities
      const totalTicketQuantity = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
      
      // Calculate paid tickets (including partially refunded with remaining amounts)
      const paidTicketQuantity = tickets
        .filter(t => t.paymentStatus === 'paid' || t.paymentStatus === 'partially_refunded')
        .reduce((sum, ticket) => {
          // For partially refunded tickets, calculate remaining quantity
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            return sum + activeTickets;
          }
          return sum + ticket.quantity;
        }, 0);
      
      const pendingTicketQuantity = tickets
        .filter(t => t.paymentStatus === 'pending')
        .reduce((sum, ticket) => sum + ticket.quantity, 0);
      
      const refundedTicketQuantity = tickets
        .filter(t => t.paymentStatus === 'refunded')
        .reduce((sum, ticket) => sum + ticket.quantity, 0);
      
      // Calculate total spending (only from paid and partially refunded tickets)
      const totalSpent = tickets
        .filter(t => t.paymentStatus === 'paid' || t.paymentStatus === 'partially_refunded')
        .reduce((sum, ticket) => {
          // For partially refunded tickets, calculate remaining amount
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            const pricePerTicket = ticket.ticketPrice / ticket.quantity;
            return sum + (activeTickets * pricePerTicket);
          }
          return sum + ticket.ticketPrice;
        }, 0);
      
      // Calculate total refunds received
      const totalRefunds = tickets
        .filter(t => t.refundStatus === 'completed')
        .reduce((sum, ticket) => sum + (ticket.refundAmount || 0), 0);
      
      // Get upcoming events (events that haven't ended yet)
      const now = new Date();
      const upcomingEvents = tickets.filter(ticket => {
        if (typeof ticket.eventId === 'object' && ticket.eventId.endDate) {
          return new Date(ticket.eventId.endDate) > now;
        }
        return false;
      });
      
      // Get past events
      const pastEvents = tickets.filter(ticket => {
        if (typeof ticket.eventId === 'object' && ticket.eventId.endDate) {
          return new Date(ticket.eventId.endDate) <= now;
        }
        return false;
      });
      
      // Calculate monthly spending for the last 6 months
      const monthlySpending = [];
      const now2 = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        
        const monthTickets = tickets.filter(ticket => {
          const ticketDate = new Date(ticket.purchasedAt);
          return ticketDate.getFullYear() === month.getFullYear() && 
                 ticketDate.getMonth() === month.getMonth() &&
                 (ticket.paymentStatus === 'paid' || ticket.paymentStatus === 'partially_refunded');
        });
        
        const monthSpending = monthTickets.reduce((sum, ticket) => {
          // For partially refunded tickets, calculate remaining amount
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            const pricePerTicket = ticket.ticketPrice / ticket.quantity;
            return sum + (activeTickets * pricePerTicket);
          }
          return sum + ticket.ticketPrice;
        }, 0);
        
        const monthTicketsCount = monthTickets.reduce((sum, ticket) => {
          // For partially refunded tickets, count only active tickets
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            return sum + activeTickets;
          }
          return sum + ticket.quantity;
        }, 0);
        
        monthlySpending.push({
          month: monthKey,
          spending: monthSpending,
          tickets: monthTicketsCount
        });
      }
      
      // Get recent activity (last 10 ticket purchases)
      const recentActivity = tickets.slice(0, 10).map(ticket => ({
        _id: ticket._id,
        type: 'ticket_purchase',
        eventTitle: typeof ticket.eventId === 'object' ? ticket.eventId.title : 'Unknown Event',
        eventId: typeof ticket.eventId === 'object' ? ticket.eventId._id : ticket.eventId,
        quantity: ticket.quantity,
        amount: ticket.ticketPrice,
        currency: ticket.currency,
        paymentStatus: ticket.paymentStatus,
        purchasedAt: ticket.purchasedAt,
        eventDate: typeof ticket.eventId === 'object' ? ticket.eventId.startDate : null,
        eventLocation: typeof ticket.eventId === 'object' ? ticket.eventId.location.name : 'Unknown Location'
      }));
      
      // Get favorite categories (based on most purchased event categories)
      const categoryCounts = {};
      tickets.forEach(ticket => {
        if (typeof ticket.eventId === 'object' && ticket.eventId.category) {
          categoryCounts[ticket.eventId.category] = (categoryCounts[ticket.eventId.category] || 0) + ticket.quantity;
        }
      });
      
      const favoriteCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }));
      
      // Get upcoming events with details
      const upcomingEventsDetails = upcomingEvents.slice(0, 5).map(ticket => ({
        _id: ticket._id,
        eventId: typeof ticket.eventId === 'object' ? ticket.eventId._id : ticket.eventId,
        eventTitle: typeof ticket.eventId === 'object' ? ticket.eventId.title : 'Unknown Event',
        eventDate: typeof ticket.eventId === 'object' ? ticket.eventId.startDate : null,
        eventLocation: typeof ticket.eventId === 'object' ? ticket.eventId.location.name : 'Unknown Location',
        eventCategory: typeof ticket.eventId === 'object' ? ticket.eventId.category : 'other',
        coverImage: typeof ticket.eventId === 'object' ? ticket.eventId.coverImage : null,
        slug: typeof ticket.eventId === 'object' ? ticket.eventId.slug : null,
        quantity: ticket.quantity,
        paymentStatus: ticket.paymentStatus,
        ticketPrice: ticket.ticketPrice,
        currency: ticket.currency
      }));
      
      // Get refund requests
      const refundRequests = tickets.filter(ticket => 
        ticket.refundStatus === 'requested' || 
        ticket.ticketDetails.some(detail => detail.refundStatus === 'requested')
      );
      
      // Calculate average ticket price
      const averageTicketPrice = totalTicketQuantity > 0 ? totalSpent / totalTicketQuantity : 0;
      
      // Get user profile data
      const userProfile = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
        memberSince: req.user.createdAt
      };
      
      res.status(200).json({
        success: true,
        data: {
          userProfile,
          ticketStats: {
            totalTickets: totalTicketQuantity,
            paidTickets: paidTicketQuantity,
            pendingTickets: pendingTicketQuantity,
            refundedTickets: refundedTicketQuantity,
            partiallyRefundedTickets: paidTicketQuantity - tickets.filter(t => t.paymentStatus === 'paid').reduce((sum, ticket) => sum + ticket.quantity, 0),
            totalSpent,
            totalRefunds,
            averageTicketPrice,
            netSpending: totalSpent
          },
          eventStats: {
            upcomingEvents: upcomingEvents.length,
            pastEvents: pastEvents.length,
            totalEvents: tickets.length
          },
          monthlySpending,
          recentActivity,
          favoriteCategories,
          upcomingEventsDetails,
          refundRequests: refundRequests.length
        }
      });
    } catch (error) {
      console.error('Get user dashboard overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard overview',
        error: error.message
      });
    }
  },

  /**
   * Get user's ticket history with filters
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getTicketHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { status, page = 1, limit = 10, sort = '-purchasedAt' } = req.query;
      
      // Build filter object
      const filter = { attendee: userId };
      
      if (status) {
        filter.paymentStatus = status;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Execute query with pagination and sorting
      const tickets = await Ticket.find(filter)
        .populate('eventId', 'title startDate endDate location category coverImage slug')
        .populate('organizer', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));
      
      // Get total count for pagination
      const total = await Ticket.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        data: {
          tickets,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get ticket history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get ticket history',
        error: error.message
      });
    }
  },

  /**
   * Get user's spending analytics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getSpendingAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;
      const { period = '6months' } = req.query;
      
      // Get all paid tickets for this user
      const tickets = await Ticket.find({ 
        attendee: userId,
        paymentStatus: { $in: ['paid', 'partially_refunded'] }
      })
      .populate('eventId', 'title category startDate')
      .sort({ purchasedAt: -1 });
      
      // Calculate monthly spending
      const monthlySpending = [];
      const now = new Date();
      const monthsToShow = period === '12months' ? 12 : 6;
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        
        const monthTickets = tickets.filter(ticket => {
          const ticketDate = new Date(ticket.purchasedAt);
          return ticketDate.getFullYear() === month.getFullYear() && 
                 ticketDate.getMonth() === month.getMonth();
        });
        
        const monthSpending = monthTickets.reduce((sum, ticket) => {
          // For partially refunded tickets, calculate remaining amount
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            const pricePerTicket = ticket.ticketPrice / ticket.quantity;
            return sum + (activeTickets * pricePerTicket);
          }
          return sum + ticket.ticketPrice;
        }, 0);
        
        const monthTicketsCount = monthTickets.reduce((sum, ticket) => {
          // For partially refunded tickets, count only active tickets
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            return sum + activeTickets;
          }
          return sum + ticket.quantity;
        }, 0);
        
        monthlySpending.push({
          month: monthKey,
          spending: monthSpending,
          tickets: monthTicketsCount
        });
      }
      
      // Calculate spending by category
      const categorySpending = {};
      tickets.forEach(ticket => {
        if (typeof ticket.eventId === 'object' && ticket.eventId.category) {
          const category = ticket.eventId.category;
          if (!categorySpending[category]) {
            categorySpending[category] = { total: 0, count: 0 };
          }
          
          // For partially refunded tickets, calculate remaining amount and count
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
            const pricePerTicket = ticket.ticketPrice / ticket.quantity;
            categorySpending[category].total += (activeTickets * pricePerTicket);
            categorySpending[category].count += activeTickets;
          } else {
            categorySpending[category].total += ticket.ticketPrice;
            categorySpending[category].count += ticket.quantity;
          }
        }
      });
      
      const categoryBreakdown = Object.entries(categorySpending).map(([category, data]) => ({
        category,
        totalSpent: data.total,
        ticketCount: data.count
      }));
      
      // Calculate total statistics
      const totalSpent = tickets.reduce((sum, ticket) => {
        // For partially refunded tickets, calculate remaining amount
        if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
          const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          const pricePerTicket = ticket.ticketPrice / ticket.quantity;
          return sum + (activeTickets * pricePerTicket);
        }
        return sum + ticket.ticketPrice;
      }, 0);
      
      const totalTickets = tickets.reduce((sum, ticket) => {
        // For partially refunded tickets, count only active tickets
        if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
          const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          return sum + activeTickets;
        }
        return sum + ticket.quantity;
      }, 0);
      
      const averageTicketPrice = totalTickets > 0 ? totalSpent / totalTickets : 0;
      
      res.status(200).json({
        success: true,
        data: {
          monthlySpending,
          categoryBreakdown,
          totalSpent,
          totalTickets,
          averageTicketPrice
        }
      });
    } catch (error) {
      console.error('Get spending analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get spending analytics',
        error: error.message
      });
    }
  },

  /**
   * Get user's favorite events and categories
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getFavorites: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Get all tickets for this user
      const tickets = await Ticket.find({ attendee: userId })
        .populate('eventId', 'title category startDate endDate location coverImage slug organizer')
        .populate('organizer', 'firstName lastName email');
      
      // Calculate favorite categories
      const categoryCounts = {};
      tickets.forEach(ticket => {
        if (typeof ticket.eventId === 'object' && ticket.eventId.category) {
          // For partially refunded tickets, count only active tickets
          let ticketCount = ticket.quantity;
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            ticketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          }
          categoryCounts[ticket.eventId.category] = (categoryCounts[ticket.eventId.category] || 0) + ticketCount;
        }
      });
      
      const favoriteCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => ({ category, count }));
      
      // Get most attended events (by organizer)
      const organizerCounts = {};
      tickets.forEach(ticket => {
        if (typeof ticket.organizer === 'object' && ticket.organizer.firstName) {
          const organizerName = `${ticket.organizer.firstName} ${ticket.organizer.lastName}`;
          // For partially refunded tickets, count only active tickets
          let ticketCount = ticket.quantity;
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            ticketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          }
          organizerCounts[organizerName] = (organizerCounts[organizerName] || 0) + ticketCount;
        }
      });
      
      const favoriteOrganizers = Object.entries(organizerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([organizerName, count]) => ({ organizerName, count }));
      
      // Get recent events attended
      const recentEvents = tickets
        .filter(ticket => typeof ticket.eventId === 'object')
        .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
        .slice(0, 10)
        .map(ticket => {
          // For partially refunded tickets, count only active tickets
          let ticketCount = ticket.quantity;
          if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
            ticketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          }
          
          return {
            _id: ticket._id,
            eventId: ticket.eventId._id,
            eventTitle: ticket.eventId.title,
            eventDate: ticket.eventId.startDate,
            eventLocation: ticket.eventId.location.name,
            eventCategory: ticket.eventId.category,
            coverImage: ticket.eventId.coverImage,
            slug: ticket.eventId.slug,
            quantity: ticketCount,
            purchasedAt: ticket.purchasedAt
          };
        });
      
      res.status(200).json({
        success: true,
        data: {
          favoriteCategories,
          favoriteOrganizers,
          recentEvents
        }
      });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get favorites',
        error: error.message
      });
    }
  }
};

module.exports = userController; 