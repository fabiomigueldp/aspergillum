/** Third-person calibration inspected in Bedrock 26.52, devtest, classic wide skin. */
export const pose={
 rightArm:[-85,-25,-10],leftArm:[-85,25,10],
 presentationRotation:[85.426458094,-7.857707502,25.710342008],
 gripOffset:[-.253047016,-.871261677,.724271667],
 firstRotation:[103.032532596,17.900541287,11.749387874],
 firstPosition:[8.050823971,-1.77702587,-1.206440933],
 firstRightRotation:[77.5,7.5,160],firstLeftRotation:[40,-20,-155],
 firstRightPosition:[10.5,-6.5,6],firstLeftPosition:[-14.25,-9.75,9.75],
 // Same neutral binding and authored [-6,24,1] grip basis used by the physically tested workspace item.
 engineCalibration:[5,-1.5,-2.25],
 empiricalGrip:[-6,24,1],
 note:'Inverse arm rotation keeps the cover vertical. Third-person fit inspected in the actual 26.52 client; first-person offsets are tracked separately. Persona and slim require separate acceptance.'
};

// Smaller books keep the established rig and first-person calibration. Their
// third-person arms converge symmetrically; inverse presentation keeps covers
// vertical. Diagnostic wide/slim composition only, pending native acceptance.
export const bookPoseOverrides={
 // Same cover plan as Missal; centered without its projecting tabs. Native retest pending.
 lectionary:{rightArm:[-85,-30.75,-10],leftArm:[-85,30.75,10],presentationRotation:[85.66807578733629,-7.417718684324183,31.406384622136212],gripOffset:[-1.8837009074847397,-3.461957472783634,0.4850183027396047]},
 missal:{rightArm:[-85,-30.75,-10],leftArm:[-85,30.75,10],presentationRotation:[85.66807578733629,-7.417718684324183,31.406384622136212],gripOffset:[-1.926610834990951,-3.435758577583599,0.47847282136810254]},
 pontifical:{rightArm:[-85,-31.66,-10],leftArm:[-85,31.66,10],presentationRotation:[85.710286140286,-7.350354495765246,32.30749709604285],gripOffset:[-1.816284917038015,-3.225557101864049,0.5024679712136291]}
};
export const poseForBook=book=>({...pose,...bookPoseOverrides[book]});
