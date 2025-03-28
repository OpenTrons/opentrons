export interface StepThunk {
  call: () => void
}

export class StepBuilder {
  private readonly steps: StepThunk[] = []
  add(step: StepThunk): this {
    this.steps.push(step)
    return this
  }

  execute(): void {
    this.steps.forEach(step => {
      step.call()
    })
  }
}
