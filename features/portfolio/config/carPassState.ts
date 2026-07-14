export const carPassState = {
  scrollCarParked: true,
  /** True while the turtle is arcing from boat to car — keeps the car parked. */
  boatToCarTransfer: false,
  /** True while the turtle is arcing from car to boat — keeps the car at its start dock. */
  carToBoatTransfer: false,
  /** True while the turtle is arcing from car to jetski — keeps the car at its route end. */
  carToJetskiTransfer: false,
  /** True while the turtle is arcing from jetski back to car — keeps the car at its route end. */
  jetskiToCarTransfer: false,
  /** World X where the car stays after the turtle leaves for jetski/yacht or returns to the boat. */
  carDockedHandoffX: null as number | null,
  /** Scroll progress when the turtle boards the car from jetski (route-end anchor). */
  carBoardScrollProgress: null as number | null,
  /** True while the turtle is arcing from jetski to yacht — keeps jetski at its handoff dock. */
  jetskiToYachtTransfer: false,
  /** World X where the jetski stays after the turtle leaves for yacht. */
  jetskiDockedHandoffX: null as number | null,
  /** True while the turtle is arcing from yacht back to jetski. */
  jetskiFromYachtTransfer: false,
  /** Scroll progress when the turtle boards jetski from yacht (route-end anchor). */
  jetskiBoardScrollProgress: null as number | null,
  /** True while the turtle is arcing from yacht to safari camel — keeps yacht at dock. */
  yachtToSafariCamelTransfer: false,
  /** True after the turtle leaves the yacht for the Lahbab camel — yacht stays docked. */
  yachtDockedAtEnd: false,
  /** True while turtle is arcing from safari camel to yacht — keeps yacht at start dock. */
  safariCamelToYachtTransfer: false,
};
