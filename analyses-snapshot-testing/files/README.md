# File Organization

## File Naming

Assuming Gen2 on Pipettes and modules; Include a suffix 1 if not.

### Naming Convention in order

- Robot (OT2 or Flex)
- Success (S) or Failure (X)
- PD or API version
- Pipettes (do your best)
- Modules
  - GRIP(gripper)
  - HS(heater shaker)
  - MM(magnetic module)
  - MB(magnetic block)
  - TC(Thermocycler)
  - TM(Temperature Module)
- Overrides `Overrides` or nothing
- Description (don't exceed 25 characters)

### Examples

#### .py

OT2_S_v2_18_None_None_Overrides_BadTypesInRTP.py
OT2_X_v2_16_None_None_TrashBinInStagingAreaCol4.py
Flex_S_v2_15_P1000_96_GRIP_HS_TM_QuickZymoMagbeadRNAExtraction,

#### .json

Flex_X_v8_P1000_96_HS_GRIP_TC_TM_GripperCollisionWithTips.json
