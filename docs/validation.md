# Validation Notes

## Checks Implemented

1. **Zernike RMS normalisation**

   Each implemented low-order mode should have RMS close to 1 over the sampled unit disk.

2. **Correction gain**

   If `gain = 0`, corrected RMS equals input RMS. If `gain = 1`, the ideal residual wavefront approaches zero.

3. **Strehl monotonicity**

   Strehl must decrease as residual RMS wavefront error increases.

4. **Quadrature intuition**

   For orthogonal unit-RMS modes, total RMS should approximately follow:

   ```text
   sigma_total ~= sqrt(sum a_j^2)
   ```

## Scientific Scope

The current validation checks the internal mathematics of the simplified modal model. It does not validate a real AO control loop, wavefront sensor reconstruction, deformable mirror influence functions, or physical diffraction propagation.
