// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TWS_Asset.sol";

/**
 * @title TWS_Oracle
 * @dev 预言机合约 - 监听外部事件，触发统一时刻
 */
contract TWS_Oracle is Ownable {
    // TWS资产合约地址
    TWS_Asset public twsAsset;
    
    // 关键词列表（触发统一的关键词）
    string[] public triggerKeywords;
    
    // 统一事件已触发标志
    bool public unificationTriggered = false;
    
    // 事件
    event KeywordAdded(string keyword);
    event KeywordRemoved(string keyword);
    event UnificationTriggered(address indexed triggerer, uint256 timestamp);
    
    constructor(address _twsAsset) {
        twsAsset = TWS_Asset(_twsAsset);
        
        // 初始化关键词
        triggerKeywords.push("联合利剑");
        triggerKeywords.push("封锁");
        triggerKeywords.push("统一");
        triggerKeywords.push("reunification");
    }
    
    /**
     * @dev 添加触发关键词（仅管理员）
     */
    function addKeyword(string memory keyword) external onlyOwner {
        triggerKeywords.push(keyword);
        emit KeywordAdded(keyword);
    }
    
    /**
     * @dev 移除触发关键词（仅管理员）
     */
    function removeKeyword(uint256 index) external onlyOwner {
        require(index < triggerKeywords.length, "Index out of bounds");
        string memory keyword = triggerKeywords[index];
        triggerKeywords[index] = triggerKeywords[triggerKeywords.length - 1];
        triggerKeywords.pop();
        emit KeywordRemoved(keyword);
    }
    
    /**
     * @dev 手动触发统一事件（仅管理员，用于测试或紧急情况）
     */
    function triggerUnification() external onlyOwner {
        require(!unificationTriggered, "Unification already triggered");
        unificationTriggered = true;
        twsAsset.triggerUnification();
        emit UnificationTriggered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 外部调用触发统一（可由后端服务调用）
     * 实际应用中，这个函数应该由链下服务在检测到关键词后调用
     */
    function externalTrigger(string memory detectedKeyword) external {
        require(!unificationTriggered, "Unification already triggered");
        
        // 检查关键词是否在列表中
        bool keywordFound = false;
        for (uint256 i = 0; i < triggerKeywords.length; i++) {
            if (keccak256(bytes(triggerKeywords[i])) == keccak256(bytes(detectedKeyword))) {
                keywordFound = true;
                break;
            }
        }
        
        require(keywordFound, "Keyword not in trigger list");
        
        unificationTriggered = true;
        twsAsset.triggerUnification();
        emit UnificationTriggered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 获取所有关键词
     */
    function getAllKeywords() external view returns (string[] memory) {
        return triggerKeywords;
    }
}


