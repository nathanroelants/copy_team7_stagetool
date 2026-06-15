import Notification from '../models/Notification.js'

export const createNotification = async (docentId, studentId, studentNaam, bedrijf, type) => {
  try {
    const messages = {
      stage_aanvaard: `Stage van ${studentNaam} bij ${bedrijf} is aanvaard`,
      stage_ingediend: `Nieuwe stage ingediend van ${studentNaam} bij ${bedrijf}`,
      logboek_ingediend: `Logboek ingediend van ${studentNaam}`,
    }

    const newNotification = new Notification({
      docentId,
      studentId,
      studentNaam,
      bedrijf,
      bericht: messages[type],
      type,
    })

    await newNotification.save()
    return newNotification
  } catch (error) {
    console.error('Notification creation error:', error)
    throw error
  }
}

export const getUnreadNotificationCount = async (docentId) => {
  try {
    const count = await Notification.countDocuments({ 
      docentId, 
      isGelezen: false 
    })
    return count
  } catch (error) {
    console.error('Get unread count error:', error)
    throw error
  }
}

export const getDocentAllNotifications = async (docentId) => {
  try {
    const notificationsList = await Notification.find({ docentId })
      .sort({ createdAt: -1 })
      .limit(20)
    return notificationsList
  } catch (error) {
    console.error('Get notifications error:', error)
    throw error
  }
}

export const markNotificationAsRead = async (notificationId) => {
  try {
    const updatedNotification = await Notification.findByIdAndUpdate(
      notificationId,
      { isGelezen: true },
      { new: true }
    )
    return updatedNotification
  } catch (error) {
    console.error('Mark as read error:', error)
    throw error
  }
}

export const deleteNotificationById = async (notificationId) => {
  try {
    await Notification.findByIdAndDelete(notificationId)
    return { success: true }
  } catch (error) {
    console.error('Delete notification error:', error)
    throw error
  }
}
