// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react'
import { vi } from 'vitest'

export const MockLPCContentContainer = vi.fn(
  ({ header, onClickButton, buttonText, secondaryButtonProps, children }) => (
    <div data-testid="mock-container">
      <div data-testid="header-prop">{header}</div>
      <button
        data-testid="primary-button"
        data-click-handler={String(!!onClickButton)}
        data-button-text={buttonText}
        onClick={onClickButton}
      />
      <button
        data-testid="secondary-button"
        data-text={secondaryButtonProps?.buttonText}
        data-category={secondaryButtonProps?.buttonCategory}
        data-type={secondaryButtonProps?.buttonType}
        data-has-click={String(!!secondaryButtonProps?.onClick)}
      />
      {children}
    </div>
  )
)
