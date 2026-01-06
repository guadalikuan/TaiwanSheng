// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TWS_Asset
 * @dev TWS战略资产合约 - ERC1155标准实现
 * 每一套房产对应一个Token ID，可以分成无数份（Shares）
 */
contract TWS_Asset is ERC1155, Ownable, Pausable {
    using Strings for uint256;

    // 资产结构体（链上元数据）
    struct BunkerStats {
        string sectorCode;      // 战区代码 (例: CN-NW-CAPITAL)
        uint256 totalShares;    // 总份额 (例: 80000)
        uint256 pricePerShare;  // 初始单价
        bool isRedeemed;        // 是否已实物兑付
        uint256 mintedAt;       // 铸造时间
    }

    // 映射: TokenID -> 资产状态
    mapping(uint256 => BunkerStats) public bunkers;
    
    // 预言机地址（由管理员控制，决定何时判定"统一"）
    address public oracleAddress;
    
    // 统一事件标志
    bool public unificationAchieved = false;
    
    // 交易税率（5%，以基点表示，100 = 1%）
    uint256 public constant TAX_RATE = 500; // 5%
    
    // 平台钱包地址（接收税费）
    address public platformWallet;
    
    // 事件
    event BunkerMinted(uint256 indexed id, string sectorCode, uint256 shares, address indexed to);
    event DoomsdayTriggered(uint256 timestamp);
    event UnificationAchieved(uint256 timestamp);
    event AssetRedeemed(uint256 indexed id, address indexed redeemer, uint256 amount);

    constructor(
        string memory uri,
        address _platformWallet
    ) ERC1155(uri) {
        platformWallet = _platformWallet;
        oracleAddress = msg.sender; // 初始预言机地址为部署者
    }

    /**
     * @dev 铸造资产（仅管理员）
     * @param to 接收地址
     * @param id Token ID
     * @param shares 份额数量
     * @param sectorCode 战区代码
     */
    function mintBunker(
        address to,
        uint256 id,
        uint256 shares,
        string memory sectorCode
    ) external onlyOwner whenNotPaused {
        require(bunkers[id].totalShares == 0, "Bunker already minted");
        
        bunkers[id] = BunkerStats({
            sectorCode: sectorCode,
            totalShares: shares,
            pricePerShare: 1 ether, // 初始单价 1 USDT
            isRedeemed: false,
            mintedAt: block.timestamp
        });
        
        _mint(to, id, shares, "");
        
        emit BunkerMinted(id, sectorCode, shares, to);
    }

    /**
     * @dev 批量铸造
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory sectorCodes
    ) external onlyOwner whenNotPaused {
        require(ids.length == amounts.length && ids.length == sectorCodes.length, "Array length mismatch");
        
        for (uint256 i = 0; i < ids.length; i++) {
            require(bunkers[ids[i]].totalShares == 0, "Bunker already minted");
            
            bunkers[ids[i]] = BunkerStats({
                sectorCode: sectorCodes[i],
                totalShares: amounts[i],
                pricePerShare: 1 ether,
                isRedeemed: false,
                mintedAt: block.timestamp
            });
            
            emit BunkerMinted(ids[i], sectorCodes[i], amounts[i], to);
        }
        
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @dev 触发统一事件（仅预言机）
     */
    function triggerUnification() external {
        require(msg.sender == oracleAddress, "Only oracle can trigger");
        require(!unificationAchieved, "Unification already achieved");
        
        unificationAchieved = true;
        emit UnificationAchieved(block.timestamp);
        emit DoomsdayTriggered(block.timestamp);
    }

    /**
     * @dev 设置预言机地址（仅管理员）
     */
    function setOracleAddress(address _oracleAddress) external onlyOwner {
        require(_oracleAddress != address(0), "Invalid oracle address");
        oracleAddress = _oracleAddress;
    }

    /**
     * @dev 设置平台钱包地址（仅管理员）
     */
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @dev 台湾用户烧掉Token，换取房产证领取资格（统一后才能使用）
     * @param id Token ID
     * @param amount 数量
     */
    function redeemProperty(uint256 id, uint256 amount) external {
        require(unificationAchieved, "WAIT FOR UNIFICATION");
        require(balanceOf(msg.sender, id) >= amount, "INSUFFICIENT BALANCE");
        require(!bunkers[id].isRedeemed, "Property already redeemed");

        // 销毁Token
        _burn(msg.sender, id, amount);
        
        // 如果全部赎回，标记为已赎回
        if (balanceOf(msg.sender, id) == 0) {
            bunkers[id].isRedeemed = true;
        }

        emit AssetRedeemed(id, msg.sender, amount);
    }

    /**
     * @dev 重写转账函数，实现交易抽税
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        
        // 如果是转账（非铸造或销毁），抽取税费
        if (from != address(0) && to != address(0) && !paused()) {
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tax = (amounts[i] * TAX_RATE) / 10000;
                if (tax > 0) {
                    // 税费转入平台钱包
                    _safeTransferFrom(from, platformWallet, ids[i], tax, data);
                }
            }
        }
    }

    /**
     * @dev 暂停合约（仅管理员）
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约（仅管理员）
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 获取资产信息
     */
    function getBunkerInfo(uint256 id) external view returns (BunkerStats memory) {
        return bunkers[id];
    }

    /**
     * @dev URI重写，支持动态元数据
     */
    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(super.uri(id), id.toString()));
    }
}


