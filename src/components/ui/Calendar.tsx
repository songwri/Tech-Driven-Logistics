import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { ko } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'

/** react-day-picker with the brand palette applied through its CSS variables
 *  (see the `.tdl-calendar` block in index.css). */
export function Calendar({ className, ...props }: DayPickerProps) {
  return <DayPicker locale={ko} className={cn('tdl-calendar', className)} {...props} />
}
