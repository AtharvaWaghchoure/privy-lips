// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface ISP1Verifier {
    function verify(bytes calldata proof, bytes calldata publicInputs) external view returns (bool verified);
}

contract SP1VerifierAdapter {
    ISP1Verifier public immutable sp1Verifier;
    
    constructor(address _sp1Verifier) {
        require(_sp1Verifier != address(0), "Verifier: invalid address");
        sp1Verifier = ISP1Verifier(_sp1Verifier);
    }

    function verifyProof(bytes calldata proof, bytes calldata publicInputs) external view returns (bool verified) {
        return sp1Verifier.verify(proof, publicInputs);
    }
}

