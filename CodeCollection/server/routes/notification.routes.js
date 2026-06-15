import express from 'express'
import {
  getUnreadCountController,
  getAllNotificationsController,
  markAsReadController,
  deleteNotificationController,
} from '../controllers/notificationController.js'

const router = express.Router()

router.get('/unread-count/:docentId', getUnreadCountController)
router.get('/all/:docentId', getAllNotificationsController)
router.put('/mark-read/:notificationId', markAsReadController)
router.delete('/delete/:notificationId', deleteNotificationController)

export default router
