// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NutriChainProvenance
 * @dev Cryptographic trust and custody verification ledger for NutriChain AI.
 */
contract NutriChainProvenance {
    
    struct Batch {
        string batchId;
        string productVariant;
        uint256 totalUnits;
        address manufacturer;
        uint256 timestamp;
        bool exists;
    }

    struct SubBatch {
        string subBatchId;
        string parentBatchId;
        bool isActivated;
        uint256 activatedAt;
        bool exists;
    }

    struct CustodyRecord {
        string holderId;
        string role; // MANUFACTURER, DISTRIBUTOR, RETAILER
        uint256 timestamp;
    }

    // Mappings
    mapping(string => Batch) public batches;
    mapping(string => SubBatch) public subBatches;
    // Map individual unit (Child QR ID) to its custody lifecycle records
    mapping(string => CustodyRecord[]) public childCustodyHistory;

    // Events for real-time telemetry indexing
    event BatchCreated(
        string indexed batchId,
        string productVariant,
        uint256 totalUnits,
        address indexed manufacturer,
        uint256 timestamp
    );

    event SubBatchActivated(
        string indexed subBatchId,
        string indexed parentBatchId,
        uint256 activatedAt
    );

    event CustodyTransferred(
        string indexed childId,
        string indexed holderId,
        string role,
        uint256 timestamp
    );

    /**
     * @notice Anchor a newly minted parent batch in the blockchain.
     */
    function createBatch(
        string memory _batchId,
        string memory _productVariant,
        uint256 _totalUnits
    ) public {
        require(!batches[_batchId].exists, "Batch already exists on-chain");
        
        batches[_batchId] = Batch({
            batchId: _batchId,
            productVariant: _productVariant,
            totalUnits: _totalUnits,
            manufacturer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit BatchCreated(_batchId, _productVariant, _totalUnits, msg.sender, block.timestamp);
    }

    /**
     * @notice Trigger Just-In-Time (JIT) sub-batch activation upon logistic dispatch.
     */
    function activateSubBatch(
        string memory _subBatchId,
        string memory _parentBatchId
    ) public {
        require(batches[_parentBatchId].exists, "Parent batch must exist");
        
        if (!subBatches[_subBatchId].exists) {
            subBatches[_subBatchId] = SubBatch({
                subBatchId: _subBatchId,
                parentBatchId: _parentBatchId,
                isActivated: true,
                activatedAt: block.timestamp,
                exists: true
            });
        } else {
            require(!subBatches[_subBatchId].isActivated, "Sub-batch already activated");
            subBatches[_subBatchId].isActivated = true;
            subBatches[_subBatchId].activatedAt = block.timestamp;
        }

        emit SubBatchActivated(_subBatchId, _parentBatchId, block.timestamp);
    }

    /**
     * @notice Records custody transition of an individual container (Child ID).
     */
    function transferCustody(
        string memory _childId,
        string memory _holderId,
        string memory _role
    ) public {
        CustodyRecord memory newRecord = CustodyRecord({
            holderId: _holderId,
            role: _role,
            timestamp: block.timestamp
        });

        childCustodyHistory[_childId].push(newRecord);

        emit CustodyTransferred(_childId, _holderId, _role, block.timestamp);
    }

    /**
     * @notice Retrieves custody steps for validation tracking.
     */
    function getCustodyHistory(string memory _childId) 
        public 
        view 
        returns (CustodyRecord[] memory) 
    {
        return childCustodyHistory[_childId];
    }
}
