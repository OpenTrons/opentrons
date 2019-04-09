Basic usage (click overlay to close):

```js
initialState = { isOpen: true }
;<div style={{ position: 'relative', width: '32em', height: '16rem' }}>
  {state.isOpen && (
    <Modal onCloseClick={() => setState({ isOpen: false })}>
      <span>Modal contents</span>
    </Modal>
  )}
  <button onClick={() => setState({ isOpen: true })}>Open modal</button>
</div>
```

Optional heading (click overlay to close):

```js
initialState = { isOpen: true }
;<div style={{ position: 'relative', width: '32em', height: '16rem' }}>
  {state.isOpen && (
    <Modal
      onCloseClick={() => setState({ isOpen: false })}
      heading={'Optional styled heading'}
    >
      <span>Modal contents</span>
    </Modal>
  )}
  <button onClick={() => setState({ isOpen: true })}>Open modal</button>
</div>
```
