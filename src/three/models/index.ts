import type { ComponentType } from 'react'
import RobotArmModel from './RobotArmModel'
import AmrModel from './AmrModel'
import AutonomousVehicleModel from './AutonomousVehicleModel'
import AutomationFacilityModel from './AutomationFacilityModel'
import PocModel from './PocModel'
import type { TechModelProps } from './types'

export type { TechModelProps }

export const techModels: Record<string, ComponentType<TechModelProps>> = {
  'robot-arm': RobotArmModel,
  'amr-agv': AmrModel,
  'autonomous-driving': AutonomousVehicleModel,
  'automation-facility': AutomationFacilityModel,
  poc: PocModel,
}
