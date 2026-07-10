export const carPassState = {
  scrollCarParked: true,
  /** True while the turtle is arcing from boat to car — keeps the car parked. */
  boatToCarTransfer: false,
  /** True while the turtle is arcing from car to boat — keeps the car at its start dock. */
  carToBoatTransfer: false,
  /** True while the turtle is arcing from yacht to safari camel — keeps yacht at dock. */
  yachtToSafariCamelTransfer: false,
  /** True after the turtle leaves the yacht for the Lahbab camel — yacht stays docked. */
  yachtDockedAtEnd: false,
  /** True while turtle is arcing from safari camel to yacht — keeps yacht at start dock. */
  safariCamelToYachtTransfer: false,
};
