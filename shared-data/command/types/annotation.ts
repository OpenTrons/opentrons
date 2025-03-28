import type { CommonCommandRunTimeInfo, CommonCommandCreateInfo } from '.'

export type AnnotationCreateCommand = CommentCreateCommand | CustomCreateCommand

export type AnnotationRunTimeCommand =
  | CommentRunTimeCommand
  | CustomRunTimeCommand

export interface CommentCreateCommand extends CommonCommandCreateInfo {
  commandType: 'comment'
  params: CommentParams
}

export interface CommentRunTimeCommand
  extends CommonCommandRunTimeInfo,
    CommentCreateCommand {
  result?: any
}

export interface CommentParams {
  message: string
}

export interface CustomCreateCommand extends CommonCommandCreateInfo {
  commandType: 'custom'
  params: CustomParams
}

export interface CustomRunTimeCommand
  extends CommonCommandRunTimeInfo,
    CustomCreateCommand {
  result?: any
}

interface CustomParams {
  [key: string]: any
}
