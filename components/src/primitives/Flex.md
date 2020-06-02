Flexbox primitive. Renders a `div` by default with `display: flex;` and accepts all primitive styling props.

```js
import {
  Icon,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  SIZE_4,
} from '@opentrons/components'
;<Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_CENTER} size={SIZE_4}>
  <Icon name="ot-logo" width="32" height="32" />
</Flex>
```

`<Flex>` is a [StyledComponent](https://styled-components.com/docs/basics#getting-started), and accepts an `as` prop to render as any other DOM element or React component.

```js
import { DIRECTION_COLUMN } from '@opentrons/components'
;<Flex as="ul" flexDirection={DIRECTION_COLUMN}>
  <li>hello</li>
  <li>world</li>
</Flex>
```
