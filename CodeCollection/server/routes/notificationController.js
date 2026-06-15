import {
  getUnreadNotificationCount,
  getDocentAllNotifications,
  markNotificationAsRead,
  deleteNotificationById,
} from '../services/notificationService.js'

export const getUnreadCountController = async (req, res) => {
  try {
    const { docentId } = req.params
    const unreadCount = await getUnreadNotificationCount(docentId)
    res.json({ count: unreadCount })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const getAllNotificationsController = async (req, res) => {
  try {
    const { docentId } = req.params
    const notificationsList = await getDocentAllNotifications(docentId)
    res.json({ notifications: notificationsList })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const markAsReadController = async (req, res) => {
  try {
    const { notificationId } = req.params
    const updatedNotification = await markNotificationAsRead(notificationId)
    res.json({ notification: updatedNotification })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const deleteNotificationController = async (req, res) => {
  try {
    const { notificationId } = req.params
    await deleteNotificationById(notificationId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
