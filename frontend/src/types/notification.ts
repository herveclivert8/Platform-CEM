export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: number;
  title: string;
  message: string;
  notificationType: NotificationType;
  isRead: boolean;
  actionUrl: string | null;
  icon: string | null;
  createdAt: string;
}

/** DTO shape returned by the FastAPI backend (snake_case). */
export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  action_url: string | null;
  icon: string | null;
  created_at: string;
}

export function mapNotification(dto: NotificationDto): Notification {
  return {
    id: dto.id,
    title: dto.title,
    message: dto.message,
    notificationType: dto.notification_type,
    isRead: dto.is_read,
    actionUrl: dto.action_url,
    icon: dto.icon,
    createdAt: dto.created_at,
  };
}

export interface NotificationListDto {
  data: NotificationDto[];
  total: number;
  unread_count: number;
}
